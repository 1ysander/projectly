import { ProviderSyncContext, ProviderSyncResult } from '../types.ts';

/**
 * Gmail provider stub.
 *
 * This plugs Gmail into the existing integration pipeline so that
 * `sync-integrations` can target `provider = 'gmail'` accounts and
 * write any parsed shipments/returns into the shared `shipments` and
 * `returns` tables.
 *
 * The real implementation should:
 * - Use `ctx.account.secret` to store Gmail OAuth tokens/refresh tokens.
 * - Use `ctx.account.config` to store things like label/scope and last message ID.
 * - Call the Gmail API to fetch delivery/return emails since the last sync.
 * - Parse those emails into ShipmentSyncCandidate[] and ReturnSyncCandidate[].
 */
export async function syncGmailProvider(ctx: ProviderSyncContext): Promise<ProviderSyncResult> {
  // For now this is a no-op implementation that keeps the pipeline functional
  // while Gmail OAuth + parsing are being implemented.
  return {
    shipments: [],
    returns: [],
    stats: {
      requested: 0,
      updated: 0,
      created: 0,
      errors: 0,
    },
  };
}

