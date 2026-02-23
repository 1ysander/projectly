import {
  ProviderSyncContext,
  ProviderSyncResult,
  ShipmentSyncCandidate,
  TrackingEventCandidate,
} from '../types.ts';

const EASYPOST_API_BASE = 'https://api.easypost.com/v2';

function normalizeCarrierCode(carrier: string): string {
  const value = carrier.toLowerCase().trim();
  if (value.includes('ups')) return 'ups';
  if (value.includes('usps') || value.includes('postal')) return 'usps';
  if (value.includes('fedex')) return 'fedex';
  if (value.includes('dhl')) return 'dhl';
  if (value.includes('ontrac')) return 'ontrac';
  if (value.includes('lasership')) return 'lasership';
  return value.replace(/\s+/g, '_');
}

function mapEasyPostStatus(
  status: string | null | undefined,
  statusDetail: string | null | undefined,
  latestMessage: string | null | undefined
): string {
  const s = (status || '').toLowerCase();
  const detail = `${statusDetail || ''} ${latestMessage || ''}`.toLowerCase();
  const combined = `${s} ${detail}`;

  if (
    s === 'return_to_sender' ||
    combined.includes('return to sender') ||
    combined.includes('returned to sender') ||
    combined.includes('refused by the receiver')
  ) {
    return 'Returning to sender';
  }
  if (s === 'delivered' || combined.includes('delivered')) return 'Delivered';
  if (s === 'out_for_delivery' || combined.includes('out for delivery')) return 'Out for delivery';
  if (s === 'in_transit' || combined.includes('in transit')) return 'In transit';
  if (s === 'pre_transit' || combined.includes('label')) return 'Label created';
  if (s === 'available_for_pickup') return 'Out for delivery';
  if (s === 'failure' || s === 'cancelled' || s === 'error') return 'Issue';
  return 'In transit';
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
    case 'Returning to sender':
      return 65;
    case 'Issue':
      return 25;
    default:
      return 40;
  }
}

function getSortedTrackingDetails(tracker: Record<string, unknown>) {
  const details = Array.isArray(tracker.tracking_details)
    ? (tracker.tracking_details as Record<string, unknown>[])
    : [];

  return [...details].sort((a, b) => {
    const aTime = Date.parse(String(a.datetime || ''));
    const bTime = Date.parse(String(b.datetime || ''));
    return bTime - aTime;
  });
}

function extractReturnTrackingNumber(messages: string[]): string | null {
  for (const message of messages) {
    const match =
      message.match(/return tracking number[:\s#-]*([A-Z0-9]{10,})/i) ||
      message.match(/returned? to sender.*?([A-Z0-9]{10,})/i);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractReturnToLocation(messages: string[]): { city: string; state: string } | null {
  for (const message of messages) {
    const match = message.match(/return to\s+([A-Za-z .'-]+),\s*([A-Z]{2})(?:\s+US)?/i);
    if (match?.[1] && match?.[2]) {
      return {
        city: match[1].trim(),
        state: match[2].toUpperCase(),
      };
    }
  }
  return null;
}

function toTrackingEvents(
  sortedDetails: Record<string, unknown>[]
): TrackingEventCandidate[] {
  return sortedDetails.slice(0, 10).map((detail) => {
    const location = (detail.tracking_location || {}) as Record<string, unknown>;
    const message =
      String(detail.message || '').trim() ||
      String(detail.status_detail || '').trim() ||
      'Carrier update';

    return {
      status: String(detail.status || 'Unknown'),
      message,
      datetime: String(detail.datetime || '').trim() || undefined,
      city: String(location.city || '').trim() || null,
      state: String(location.state || '').trim() || null,
    };
  });
}

async function fetchTracker(apiKey: string, carrierCode: string, trackingNumber: string) {
  const authHeader = `Basic ${btoa(`${apiKey}:`)}`;
  const trackerUrl = `${EASYPOST_API_BASE}/trackers/${encodeURIComponent(carrierCode)}/${encodeURIComponent(trackingNumber)}`;

  let response = await fetch(trackerUrl, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    response = await fetch(`${EASYPOST_API_BASE}/trackers`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tracker: {
          carrier: carrierCode,
          tracking_code: trackingNumber,
        },
      }),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EasyPost tracker request failed (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  return (json.tracker as Record<string, unknown>) || json;
}

export async function syncEasyPostProvider(ctx: ProviderSyncContext): Promise<ProviderSyncResult> {
  const apiKey = String(ctx.account.secret.api_key || '').trim();
  if (!apiKey) {
    throw new Error('EasyPost account is missing secret.api_key');
  }

  const carrierFilter = Array.isArray(ctx.account.config.carriers)
    ? (ctx.account.config.carriers as string[]).map((value) => value.toLowerCase())
    : null;

  const candidateShipments = ctx.existingShipments.filter((shipment) => {
    if (!shipment.tracking_number) return false;
    const normalized = shipment.carrier.toLowerCase();
    if (carrierFilter && carrierFilter.length > 0) {
      return carrierFilter.includes(normalized);
    }
    return true;
  });

  const updates: ShipmentSyncCandidate[] = [];
  let errors = 0;

  for (const shipment of candidateShipments) {
    try {
      const carrierCode = normalizeCarrierCode(shipment.carrier || '');
      const tracker = await fetchTracker(apiKey, carrierCode, shipment.tracking_number);
      const sortedDetails = getSortedTrackingDetails(tracker);
      const latestDetail = sortedDetails[0] || null;
      const trackingLocation = (latestDetail?.tracking_location || {}) as Record<string, unknown>;

      const latestMessage =
        String((latestDetail?.message as string) || '').trim() ||
        String((tracker.status_detail as string) || '').trim() ||
        null;

      const mappedStatus = mapEasyPostStatus(
        String(tracker.status || (latestDetail?.status as string) || ''),
        String(tracker.status_detail || ''),
        latestMessage
      );

      const allMessages = [
        String(tracker.status_detail || '').trim(),
        ...sortedDetails.map((detail) => String(detail.message || '').trim()),
      ].filter(Boolean);

      const returnTrackingNumber = extractReturnTrackingNumber(allMessages);
      const returnToLocation = extractReturnToLocation(allMessages);
      const trackingEvents = toTrackingEvents(sortedDetails);

      updates.push({
        tracking_number: shipment.tracking_number,
        carrier: shipment.carrier || String(tracker.carrier || carrierCode || 'Carrier'),
        status: mappedStatus,
        progress: progressFromStatus(mappedStatus),
        last_scan: latestMessage || `Carrier update: ${mappedStatus}`,
        eta: (tracker.est_delivery_date as string) || shipment.eta || null,
        delivery_city: (trackingLocation.city as string) || shipment.delivery_city || null,
        delivery_state: (trackingLocation.state as string) || shipment.delivery_state || null,
        return_tracking_number: returnTrackingNumber,
        return_to_city: returnToLocation?.city || shipment.return_to_city || null,
        return_to_state: returnToLocation?.state || shipment.return_to_state || null,
        tracking_events: trackingEvents,
        item_name: shipment.item_name || null,
        merchant_name: shipment.merchant_name || null,
      });
    } catch (error) {
      errors += 1;
      console.warn('EasyPost sync failed for tracking number', shipment.tracking_number, error);
    }
  }

  return {
    shipments: updates,
    returns: [],
    stats: {
      requested: candidateShipments.length,
      updated: updates.length,
      created: 0,
      errors,
    },
  };
}
