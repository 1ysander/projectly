import { AwsClient } from 'npm:aws4fetch@1.0.20';
import {
  ProviderSyncContext,
  ProviderSyncResult,
  ReturnSyncCandidate,
  ShipmentSyncCandidate,
} from '../types.ts';

function getSpApiBase(region: string): string {
  const normalized = region.toLowerCase();
  if (normalized === 'eu') return 'https://sellingpartnerapi-eu.amazon.com';
  if (normalized === 'fe') return 'https://sellingpartnerapi-fe.amazon.com';
  return 'https://sellingpartnerapi-na.amazon.com';
}

function mapAmazonOrderStatus(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('delivered')) return 'Delivered';
  if (s.includes('shipped') || s.includes('partiallyshipped')) return 'In transit';
  if (s.includes('unshipped') || s.includes('pending') || s.includes('invoiceunconfirmed')) return 'Label created';
  if (s.includes('canceled') || s.includes('cancelled')) return 'Issue';
  return 'In transit';
}

function progressFromStatus(status: string): number {
  switch (status) {
    case 'Label created':
      return 10;
    case 'In transit':
      return 55;
    case 'Delivered':
      return 100;
    case 'Issue':
      return 25;
    default:
      return 45;
  }
}

async function getLwaAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Amazon LWA token request failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  const token = String(json.access_token || '').trim();
  if (!token) {
    throw new Error('Amazon LWA token response missing access_token');
  }

  return token;
}

async function callSpApi(
  awsClient: AwsClient,
  baseUrl: string,
  lwaAccessToken: string,
  path: string,
  query: URLSearchParams
): Promise<Record<string, unknown>> {
  const url = `${baseUrl}${path}?${query.toString()}`;
  const response = await awsClient.fetch(url, {
    method: 'GET',
    headers: {
      'x-amz-access-token': lwaAccessToken,
      'content-type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Amazon SP-API request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as Record<string, unknown>;
}

function getLookbackIso(lastSyncedAt: string | null, lookbackHours: number): string {
  if (lastSyncedAt) {
    const parsed = new Date(lastSyncedAt);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();
}

export async function syncAmazonProvider(ctx: ProviderSyncContext): Promise<ProviderSyncResult> {
  const lwaClientId = String(ctx.account.secret.lwa_client_id || '').trim();
  const lwaClientSecret = String(ctx.account.secret.lwa_client_secret || '').trim();
  const lwaRefreshToken = String(ctx.account.secret.refresh_token || '').trim();
  const awsAccessKeyId = String(ctx.account.secret.aws_access_key_id || '').trim();
  const awsSecretAccessKey = String(ctx.account.secret.aws_secret_access_key || '').trim();
  const awsSessionToken = String(ctx.account.secret.aws_session_token || '').trim();

  if (!lwaClientId || !lwaClientSecret || !lwaRefreshToken) {
    throw new Error('Amazon account requires LWA credentials: lwa_client_id, lwa_client_secret, refresh_token');
  }
  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error('Amazon account requires AWS credentials: aws_access_key_id and aws_secret_access_key');
  }

  const region = String(ctx.account.config.region || 'na').trim();
  const marketplaces = Array.isArray(ctx.account.config.marketplace_ids)
    ? (ctx.account.config.marketplace_ids as string[]).filter(Boolean)
    : [];

  if (marketplaces.length === 0) {
    throw new Error('Amazon account config.marketplace_ids must include at least one marketplace id');
  }

  const lookbackHours = Number(ctx.account.config.lookback_hours || 24);
  const maxPages = Math.max(1, Math.min(20, Number(ctx.account.config.max_pages || 5)));

  const baseUrl = getSpApiBase(region);
  const lwaAccessToken = await getLwaAccessToken(lwaClientId, lwaClientSecret, lwaRefreshToken);

  const awsClient = new AwsClient({
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
    sessionToken: awsSessionToken || undefined,
    service: 'execute-api',
    region: region.toLowerCase() === 'eu' ? 'eu-west-1' : region.toLowerCase() === 'fe' ? 'us-west-2' : 'us-east-1',
  });

  const shipments: ShipmentSyncCandidate[] = [];
  const returns: ReturnSyncCandidate[] = [];
  let nextToken: string | null = null;
  let page = 0;
  let requested = 0;

  do {
    const query = new URLSearchParams();
    if (nextToken) {
      query.set('NextToken', nextToken);
    } else {
      query.set('MarketplaceIds', marketplaces.join(','));
      query.set('LastUpdatedAfter', getLookbackIso(ctx.lastSyncedAt, lookbackHours));
    }

    const response = await callSpApi(
      awsClient,
      baseUrl,
      lwaAccessToken,
      '/orders/v0/orders',
      query
    );

    const payload = (response.payload || {}) as Record<string, unknown>;
    const orders = Array.isArray(payload.Orders) ? (payload.Orders as Record<string, unknown>[]) : [];
    requested += orders.length;

    for (const order of orders) {
      const amazonOrderId = String(order.AmazonOrderId || '').trim();
      if (!amazonOrderId) continue;

      const orderStatus = String(order.OrderStatus || '');
      const mappedStatus = mapAmazonOrderStatus(orderStatus);

      shipments.push({
        tracking_number: amazonOrderId,
        carrier: 'Amazon',
        status: mappedStatus,
        progress: progressFromStatus(mappedStatus),
        last_scan: `Amazon order status: ${orderStatus || 'Unknown'}`,
        eta: (order.LatestDeliveryDate as string) || (order.EarliestDeliveryDate as string) || null,
        merchant_name: 'Amazon',
      });

      if (orderStatus.toLowerCase().includes('returned')) {
        returns.push({
          merchant_name: 'Amazon',
          order_number: String(order.SellerOrderId || amazonOrderId),
          status: 'Refund pending',
          method: 'mail',
          items: ['Amazon return item'],
        });
      }
    }

    nextToken = String(payload.NextToken || '').trim() || null;
    page += 1;
  } while (nextToken && page < maxPages);

  const dedupedShipments = new Map<string, ShipmentSyncCandidate>();
  for (const shipment of shipments) {
    const key = `${shipment.carrier.toLowerCase()}::${shipment.tracking_number.toLowerCase()}`;
    dedupedShipments.set(key, shipment);
  }

  const dedupedReturns = new Map<string, ReturnSyncCandidate>();
  for (const returnItem of returns) {
    const key = `${returnItem.merchant_name.toLowerCase()}::${returnItem.order_number.toLowerCase()}`;
    dedupedReturns.set(key, returnItem);
  }

  return {
    shipments: [...dedupedShipments.values()],
    returns: [...dedupedReturns.values()],
    stats: {
      requested,
      updated: dedupedShipments.size + dedupedReturns.size,
      created: 0,
      errors: 0,
    },
  };
}
