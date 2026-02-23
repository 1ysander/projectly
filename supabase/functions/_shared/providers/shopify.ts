import {
  ProviderSyncContext,
  ProviderSyncResult,
  ReturnSyncCandidate,
  ShipmentSyncCandidate,
} from '../types.ts';

const DEFAULT_SHOPIFY_API_VERSION = '2025-01';

function mapFulfillmentStatus(status: string | null | undefined): string {
  const s = (status || '').toUpperCase();
  if (s.includes('DELIVERED')) return 'Delivered';
  if (s.includes('OUT_FOR_DELIVERY')) return 'Out for delivery';
  if (s.includes('FULFILLED') || s.includes('IN_TRANSIT') || s.includes('PARTIALLY')) return 'In transit';
  if (s.includes('UNFULFILLED') || s.includes('PENDING')) return 'Label created';
  return 'In transit';
}

function mapReturnStatus(status: string | null | undefined): string {
  const s = (status || '').toUpperCase();
  if (s.includes('REQUEST')) return 'Requested';
  if (s.includes('OPEN') || s.includes('IN_PROGRESS')) return 'In transit';
  if (s.includes('CLOSED') || s.includes('RECEIVED')) return 'Refund pending';
  if (s.includes('REFUNDED')) return 'Refunded';
  if (s.includes('DECLINED') || s.includes('CANCEL')) return 'Denied';
  return 'Requested';
}

function progressFromStatus(status: string): number {
  switch (status) {
    case 'Label created':
      return 10;
    case 'In transit':
      return 50;
    case 'Out for delivery':
      return 85;
    case 'Delivered':
      return 100;
    default:
      return 45;
  }
}

async function runGraphQL(
  endpoint: string,
  token: string,
  query: string,
  variables: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify GraphQL request failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return (json.data as Record<string, unknown>) || {};
}

function getLookbackIso(lastSyncedAt: string | null, lookbackHours: number): string {
  if (lastSyncedAt) {
    const parsed = new Date(lastSyncedAt);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const fallback = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  return fallback.toISOString();
}

export async function syncShopifyProvider(ctx: ProviderSyncContext): Promise<ProviderSyncResult> {
  const storeDomain = String(ctx.account.secret.store_domain || '').trim();
  const adminToken = String(ctx.account.secret.admin_access_token || '').trim();

  if (!storeDomain || !adminToken) {
    throw new Error('Shopify account requires secret.store_domain and secret.admin_access_token');
  }

  const apiVersion = String(ctx.account.config.api_version || DEFAULT_SHOPIFY_API_VERSION).trim();
  const endpoint = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;

  const lookbackHours = Number(ctx.account.config.lookback_hours || 72);
  const maxPages = Math.max(1, Math.min(20, Number(ctx.account.config.max_pages || 5)));
  const updatedAfter = getLookbackIso(ctx.lastSyncedAt, lookbackHours);
  const searchQuery = `updated_at:>=${updatedAfter}`;

  const shipments: ShipmentSyncCandidate[] = [];
  const returns: ReturnSyncCandidate[] = [];

  const queryWithReturns = `
    query SyncOrders($first: Int!, $after: String, $query: String!) {
      orders(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true, query: $query) {
        edges {
          cursor
          node {
            name
            displayFulfillmentStatus
            fulfillments {
              status
              updatedAt
              trackingInfo {
                number
                company
              }
            }
            returns(first: 10) {
              nodes {
                status
                returnLineItems(first: 20) {
                  nodes {
                    fulfillmentLineItem {
                      lineItem {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const queryWithoutReturns = `
    query SyncOrders($first: Int!, $after: String, $query: String!) {
      orders(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true, query: $query) {
        edges {
          cursor
          node {
            name
            displayFulfillmentStatus
            fulfillments {
              status
              updatedAt
              trackingInfo {
                number
                company
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  let afterCursor: string | null = null;
  let hasNextPage = true;
  let page = 0;
  let includeReturns = true;
  let requestedOrders = 0;
  let errors = 0;

  while (hasNextPage && page < maxPages) {
    page += 1;

    let data: Record<string, unknown>;
    try {
      data = await runGraphQL(
        endpoint,
        adminToken,
        includeReturns ? queryWithReturns : queryWithoutReturns,
        {
          first: 50,
          after: afterCursor,
          query: searchQuery,
        }
      );
    } catch (error) {
      const message = String(error);
      if (includeReturns && (message.includes('returns') || message.includes('Access denied'))) {
        includeReturns = false;
        page -= 1;
        continue;
      }
      throw error;
    }

    const orders = (data.orders || {}) as Record<string, unknown>;
    const edges = Array.isArray(orders.edges) ? (orders.edges as Record<string, unknown>[]) : [];
    requestedOrders += edges.length;

    for (const edge of edges) {
      const node = (edge.node || {}) as Record<string, unknown>;
      const orderName = String(node.name || '').replace(/^#/, '').trim() || 'Shopify';

      const fulfillments = Array.isArray(node.fulfillments)
        ? (node.fulfillments as Record<string, unknown>[])
        : [];

      for (const fulfillment of fulfillments) {
        const trackingInfo = Array.isArray(fulfillment.trackingInfo)
          ? (fulfillment.trackingInfo as Record<string, unknown>[])
          : [];

        const fulfillmentStatus =
          mapFulfillmentStatus(String(node.displayFulfillmentStatus || '')) ||
          mapFulfillmentStatus(String(fulfillment.status || ''));

        for (const tracking of trackingInfo) {
          const trackingNumber = String(tracking.number || '').trim();
          if (!trackingNumber) continue;

          shipments.push({
            carrier: String(tracking.company || 'Shopify'),
            tracking_number: trackingNumber,
            status: fulfillmentStatus,
            progress: progressFromStatus(fulfillmentStatus),
            last_scan: `Shopify fulfillment: ${fulfillmentStatus}`,
            merchant_name: 'Shopify',
          });
        }
      }

      if (includeReturns) {
        const returnNodes = Array.isArray((node.returns as Record<string, unknown>)?.nodes)
          ? (((node.returns as Record<string, unknown>).nodes || []) as Record<string, unknown>[])
          : [];

        for (const returnNode of returnNodes) {
          const returnItems = Array.isArray((returnNode.returnLineItems as Record<string, unknown>)?.nodes)
            ? (((returnNode.returnLineItems as Record<string, unknown>).nodes || []) as Record<string, unknown>[])
            : [];

          const itemNames = returnItems
            .map((entry) =>
              String(
                ((entry.fulfillmentLineItem as Record<string, unknown>)?.lineItem as Record<string, unknown>)?.name ||
                  ''
              ).trim()
            )
            .filter(Boolean);

          returns.push({
            merchant_name: 'Shopify',
            order_number: orderName,
            status: mapReturnStatus(String(returnNode.status || '')),
            method: 'mail',
            items: itemNames.length > 0 ? itemNames : ['Shopify return item'],
          });
        }
      }
    }

    const pageInfo = (orders.pageInfo || {}) as Record<string, unknown>;
    hasNextPage = Boolean(pageInfo.hasNextPage);
    afterCursor = (pageInfo.endCursor as string) || null;
  }

  const dedupedShipmentMap = new Map<string, ShipmentSyncCandidate>();
  for (const shipment of shipments) {
    const key = `${shipment.carrier.toLowerCase()}::${shipment.tracking_number.toLowerCase()}`;
    dedupedShipmentMap.set(key, shipment);
  }

  const dedupedReturnsMap = new Map<string, ReturnSyncCandidate>();
  for (const returnItem of returns) {
    const itemKey = (returnItem.items || []).join('|').toLowerCase();
    const key = `${returnItem.merchant_name.toLowerCase()}::${returnItem.order_number.toLowerCase()}::${itemKey}`;
    dedupedReturnsMap.set(key, returnItem);
  }

  return {
    shipments: [...dedupedShipmentMap.values()],
    returns: [...dedupedReturnsMap.values()],
    stats: {
      requested: requestedOrders,
      updated: dedupedShipmentMap.size + dedupedReturnsMap.size,
      created: 0,
      errors,
    },
  };
}
