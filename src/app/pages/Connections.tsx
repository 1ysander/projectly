import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Mail,
  RefreshCw,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { type Connection } from '../data/mock-data';
import { useConnections } from '../context/AppContext';
import { StatusPill } from '../components/shared/StatusPill';
import { FileUpload } from '../components/shared/FileUpload';
import { useClipboard } from '../hooks/useClipboard';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { toast } from 'sonner';
import {
  deleteIntegrationAccount,
  type IntegrationAccount,
  listIntegrationAccounts,
  type ProviderName,
  syncIntegrations,
  updateIntegrationAccount,
  upsertIntegrationAccount,
} from '../../lib/integrations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const iconMap: Record<string, typeof Mail> = {
  mail: Mail,
  'shopping-cart': ShoppingCart,
  truck: Truck,
  tag: Store,
  store: Store,
};

type ProviderFieldType = 'text' | 'password' | 'number' | 'select';
type ConnectionStatus = Connection['status'];

interface ProviderField {
  key: string;
  label: string;
  type: ProviderFieldType;
  target: 'secret' | 'config';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  isList?: boolean;
}

interface ProviderDefinition {
  provider: ProviderName;
  defaultName: string;
  description: string;
  type: Connection['type'];
  logo: keyof typeof iconMap;
  externalIdLabel: string;
  externalIdPlaceholder: string;
  secretFields: ProviderField[];
  configFields: ProviderField[];
}

const providerDefinitions: ProviderDefinition[] = [
  {
    provider: 'easypost',
    defaultName: 'EasyPost',
    description: 'Live tracking events from UPS, USPS, FedEx, DHL, and more.',
    type: 'carrier',
    logo: 'truck',
    externalIdLabel: 'Account ID',
    externalIdPlaceholder: 'primary-easypost-account',
    secretFields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        target: 'secret',
        required: true,
        placeholder: 'EZAK...',
      },
      {
        key: 'webhook_secret',
        label: 'Webhook Secret',
        type: 'password',
        target: 'secret',
        placeholder: 'hmac_secret',
      },
    ],
    configFields: [
      {
        key: 'carriers',
        label: 'Carriers (optional, comma separated)',
        type: 'text',
        target: 'config',
        isList: true,
        placeholder: 'ups, usps, fedex',
      },
    ],
  },
  {
    provider: 'shopify',
    defaultName: 'Shopify',
    description: 'Sync order and fulfillment status directly from your Shopify store.',
    type: 'merchant',
    logo: 'store',
    externalIdLabel: 'Store ID',
    externalIdPlaceholder: 'my-store.myshopify.com',
    secretFields: [
      {
        key: 'store_domain',
        label: 'Store Domain',
        type: 'text',
        target: 'secret',
        required: true,
        placeholder: 'my-store.myshopify.com',
      },
      {
        key: 'admin_access_token',
        label: 'Admin Access Token',
        type: 'password',
        target: 'secret',
        required: true,
        placeholder: 'shpat_...',
      },
      {
        key: 'webhook_secret',
        label: 'Webhook Secret',
        type: 'password',
        target: 'secret',
        required: true,
        placeholder: 'app_shared_secret',
      },
    ],
    configFields: [
      {
        key: 'api_version',
        label: 'API Version',
        type: 'text',
        target: 'config',
        placeholder: '2025-01',
      },
      {
        key: 'lookback_hours',
        label: 'Lookback Hours',
        type: 'number',
        target: 'config',
        placeholder: '72',
      },
      {
        key: 'max_pages',
        label: 'Max Pages',
        type: 'number',
        target: 'config',
        placeholder: '5',
      },
    ],
  },
  {
    provider: 'amazon_sp_api',
    defaultName: 'Amazon Seller',
    description: 'Connect Amazon SP-API to sync orders, tracking, and returns.',
    type: 'merchant',
    logo: 'shopping-cart',
    externalIdLabel: 'Seller ID',
    externalIdPlaceholder: 'A2ABC1234XYZ',
    secretFields: [
      {
        key: 'lwa_client_id',
        label: 'LWA Client ID',
        type: 'password',
        target: 'secret',
        required: true,
      },
      {
        key: 'lwa_client_secret',
        label: 'LWA Client Secret',
        type: 'password',
        target: 'secret',
        required: true,
      },
      {
        key: 'refresh_token',
        label: 'Refresh Token',
        type: 'password',
        target: 'secret',
        required: true,
      },
      {
        key: 'aws_access_key_id',
        label: 'AWS Access Key ID',
        type: 'password',
        target: 'secret',
        required: true,
      },
      {
        key: 'aws_secret_access_key',
        label: 'AWS Secret Access Key',
        type: 'password',
        target: 'secret',
        required: true,
      },
      {
        key: 'aws_session_token',
        label: 'AWS Session Token (optional)',
        type: 'password',
        target: 'secret',
      },
      {
        key: 'webhook_secret',
        label: 'Webhook Secret (optional)',
        type: 'password',
        target: 'secret',
      },
    ],
    configFields: [
      {
        key: 'region',
        label: 'Region',
        type: 'select',
        target: 'config',
        required: true,
        options: ['na', 'eu', 'fe'],
      },
      {
        key: 'marketplace_ids',
        label: 'Marketplace IDs (comma separated)',
        type: 'text',
        target: 'config',
        required: true,
        isList: true,
        placeholder: 'ATVPDKIKX0DER',
      },
      {
        key: 'lookback_hours',
        label: 'Lookback Hours',
        type: 'number',
        target: 'config',
        placeholder: '72',
      },
      {
        key: 'max_pages',
        label: 'Max Pages',
        type: 'number',
        target: 'config',
        placeholder: '5',
      },
    ],
  },
];

const providerMap = providerDefinitions.reduce<Record<ProviderName, ProviderDefinition>>(
  (acc, item) => ({ ...acc, [item.provider]: item }),
  {} as Record<ProviderName, ProviderDefinition>
);

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return fallback;
}

function mapProviderStatusToConnectionStatus(
  status: IntegrationAccount['status'],
  isSyncing: boolean
): ConnectionStatus {
  if (isSyncing) return 'Syncing';
  if (status === 'active') return 'Connected';
  if (status === 'paused') return 'Not connected';
  return 'Needs attention';
}

function formatProviderLastSync(lastSyncedAt: string | null): string {
  if (!lastSyncedAt) return 'Never synced';
  const date = new Date(lastSyncedAt);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return formatDistanceToNow(date, { addSuffix: true });
}

function parseProviderFieldValue(rawValue: string, field: ProviderField): unknown {
  if (field.type === 'number') return Number(rawValue);
  if (field.isList) {
    return rawValue
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return rawValue;
}

function createCredentialDefaults(
  definition: ProviderDefinition,
  account: IntegrationAccount | null
): Record<string, string> {
  const values: Record<string, string> = {
    display_name: account?.display_name || definition.defaultName,
    external_account_id: account?.external_account_id || '',
    refresh_interval_minutes: String(account?.refresh_interval_minutes || 60),
  };

  for (const field of definition.configFields) {
    const rawValue = account?.config?.[field.key];
    if (Array.isArray(rawValue)) {
      values[field.key] = rawValue.map((value) => String(value)).join(', ');
    } else if (rawValue !== undefined && rawValue !== null) {
      values[field.key] = String(rawValue);
    } else if (field.type === 'select' && field.options && field.options.length > 0) {
      values[field.key] = field.options[0];
    } else {
      values[field.key] = '';
    }
  }

  for (const field of definition.secretFields) {
    values[field.key] = '';
  }

  return values;
}

export function Connections() {
  const { connections, connectAccount, disconnectAccount, updateConnection, reloadData } =
    useConnections();
  const { copy } = useClipboard();

  const [manageConnectionId, setManageConnectionId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isConnectionResyncing, setIsConnectionResyncing] = useState<string | null>(null);

  const [integrationAccounts, setIntegrationAccounts] = useState<IntegrationAccount[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [refreshingProviders, setRefreshingProviders] = useState(false);
  const [syncingIntegrationId, setSyncingIntegrationId] = useState<string | null>(null);
  const [manageIntegrationId, setManageIntegrationId] = useState<string | null>(null);
  const [integrationError, setIntegrationError] = useState<string | null>(null);

  const [credentialModal, setCredentialModal] = useState<{
    provider: ProviderName;
    accountId?: string;
  } | null>(null);
  const [credentialForm, setCredentialForm] = useState<Record<string, string>>({});
  const [savingCredentials, setSavingCredentials] = useState(false);

  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<{
    type: 'connection' | 'integration';
    id: string;
  } | null>(null);

  const managedConn =
    connections.find((connection) => connection.id === manageConnectionId) || null;
  const managedIntegration =
    integrationAccounts.find((account) => account.id === manageIntegrationId) || null;
  const credentialAccount =
    integrationAccounts.find((account) => account.id === credentialModal?.accountId) || null;
  const credentialDefinition = credentialModal ? providerMap[credentialModal.provider] : null;

  const nonProviderConnections = useMemo(
    () => connections.filter((connection) => !connection.data_scope?.startsWith('integration:')),
    [connections]
  );

  const emailConns = nonProviderConnections.filter((connection) => connection.type === 'email');
  const merchantConns = nonProviderConnections.filter(
    (connection) => connection.type === 'merchant'
  );
  const carrierConns = nonProviderConnections.filter(
    (connection) => connection.type === 'carrier'
  );

  const totalConnected =
    nonProviderConnections.filter(
      (connection) => connection.status === 'Connected' || connection.status === 'Syncing'
    ).length + integrationAccounts.filter((account) => account.status === 'active').length;

  const totalNeedsAttention =
    nonProviderConnections.filter((connection) => connection.status === 'Needs attention').length +
    integrationAccounts.filter((account) => account.status === 'error').length;

  const providerCards = useMemo(() => {
    return providerDefinitions.map((definition) => {
      const account =
        integrationAccounts.find((item) => item.provider === definition.provider) || null;
      return { definition, account };
    });
  }, [integrationAccounts]);

  const loadIntegrations = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setLoadingIntegrations(true);

    try {
      const { accounts } = await listIntegrationAccounts(false);
      setIntegrationAccounts(accounts);
      setIntegrationError(null);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to load integration accounts');
      setIntegrationError(message);
      if (!silent) toast.error(message);
    } finally {
      if (!silent) setLoadingIntegrations(false);
    }
  };

  useEffect(() => {
    void loadIntegrations();
  }, []);

  const openCredentialModal = (provider: ProviderName, account: IntegrationAccount | null) => {
    const definition = providerMap[provider];
    setCredentialForm(createCredentialDefaults(definition, account));
    setCredentialModal({ provider, accountId: account?.id });
  };

  const closeCredentialModal = () => {
    setCredentialModal(null);
    setCredentialForm({});
  };

  const updateCredentialForm = (key: string, value: string) => {
    setCredentialForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveIntegrationCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!credentialDefinition) return;

    const isUpdate = Boolean(credentialAccount);
    const displayName = credentialForm.display_name?.trim() || credentialDefinition.defaultName;

    let externalAccountId = credentialForm.external_account_id?.trim() || '';
    if (!externalAccountId && credentialDefinition.provider === 'shopify') {
      externalAccountId = credentialForm.store_domain?.trim() || '';
    }

    if (!externalAccountId) {
      toast.error(`${credentialDefinition.externalIdLabel} is required`);
      return;
    }

    const intervalValue = Number(credentialForm.refresh_interval_minutes || '60');
    if (!Number.isFinite(intervalValue) || intervalValue < 5) {
      toast.error('Refresh interval must be 5 minutes or more');
      return;
    }

    const secretPayload: Record<string, unknown> = {};
    const configPayload: Record<string, unknown> = {};

    for (const field of credentialDefinition.secretFields) {
      const rawValue = credentialForm[field.key]?.trim() || '';
      const hasExistingSecretField =
        credentialAccount?.secret_fields?.includes(field.key) || false;

      if (!rawValue) {
        if (field.required && (!isUpdate || !hasExistingSecretField)) {
          toast.error(`${field.label} is required`);
          return;
        }
        continue;
      }

      secretPayload[field.key] = parseProviderFieldValue(rawValue, field);
    }

    for (const field of credentialDefinition.configFields) {
      const rawValue = credentialForm[field.key]?.trim() || '';
      const existingValue = credentialAccount?.config?.[field.key];

      if (!rawValue) {
        if (field.required && (existingValue === null || existingValue === undefined || existingValue === '')) {
          toast.error(`${field.label} is required`);
          return;
        }
        continue;
      }

      const parsedValue = parseProviderFieldValue(rawValue, field);
      if (field.type === 'number' && !Number.isFinite(parsedValue as number)) {
        toast.error(`${field.label} must be a valid number`);
        return;
      }
      configPayload[field.key] = parsedValue;
    }

    const basePayload = {
      display_name: displayName,
      external_account_id: externalAccountId,
      refresh_interval_minutes: Math.round(intervalValue),
      status: 'active' as const,
      ...(Object.keys(configPayload).length > 0 ? { config: configPayload } : {}),
      ...(Object.keys(secretPayload).length > 0 ? { secret: secretPayload } : {}),
    };

    setSavingCredentials(true);
    try {
      if (credentialAccount) {
        await updateIntegrationAccount({
          id: credentialAccount.id,
          ...basePayload,
        });
        toast.success(`${credentialDefinition.defaultName} updated`);
      } else {
        await upsertIntegrationAccount({
          provider: credentialDefinition.provider,
          ...basePayload,
        });
        toast.success(`${credentialDefinition.defaultName} connected`);
      }

      await Promise.all([loadIntegrations({ silent: true }), reloadData()]);
      closeCredentialModal();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save integration credentials'));
    } finally {
      setSavingCredentials(false);
    }
  };

  const syncOneIntegration = async (account: IntegrationAccount) => {
    setSyncingIntegrationId(account.id);
    try {
      await syncIntegrations({
        mode: 'manual',
        accountId: account.id,
        provider: account.provider,
      });
      await Promise.all([loadIntegrations({ silent: true }), reloadData()]);
      toast.success(`${account.display_name || providerMap[account.provider].defaultName} synced`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to sync provider'));
    } finally {
      setSyncingIntegrationId(null);
    }
  };

  const syncAllProviders = async () => {
    setRefreshingProviders(true);
    try {
      await syncIntegrations({ mode: 'manual' });
      await Promise.all([loadIntegrations({ silent: true }), reloadData()]);
      toast.success('Provider sync completed');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to sync providers'));
    } finally {
      setRefreshingProviders(false);
    }
  };

  const toggleIntegrationStatus = async (account: IntegrationAccount) => {
    const nextStatus = account.status === 'paused' ? 'active' : 'paused';
    try {
      await updateIntegrationAccount({
        id: account.id,
        status: nextStatus,
      });
      await Promise.all([loadIntegrations({ silent: true }), reloadData()]);
      toast.success(
        nextStatus === 'active'
          ? `${account.display_name || providerMap[account.provider].defaultName} resumed`
          : `${account.display_name || providerMap[account.provider].defaultName} paused`
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update integration status'));
    }
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget) return;

    try {
      if (disconnectTarget.type === 'integration') {
        await deleteIntegrationAccount(disconnectTarget.id);
        await Promise.all([loadIntegrations({ silent: true }), reloadData()]);
        setManageIntegrationId(null);
        toast.success('Integration disconnected');
      } else {
        await disconnectAccount(disconnectTarget.id);
        setManageConnectionId(null);
        toast.success('Connection disconnected');
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to disconnect account'));
    }
  };

  const ConnTile = ({ conn }: { conn: Connection }) => {
    const Icon = iconMap[conn.logo] || Mail;
    return (
      <div className="bg-white rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              conn.status === 'Connected'
                ? 'bg-cobalt-light'
                : conn.status === 'Needs attention'
                  ? 'bg-warning-light'
                  : conn.status === 'Syncing'
                    ? 'bg-cobalt-light'
                    : 'bg-[#F3F4F6]'
            }`}
          >
            {conn.status === 'Syncing' ? (
              <Loader2 size={18} className="text-cobalt animate-spin" />
            ) : (
              <Icon
                size={18}
                className={
                  conn.status === 'Connected'
                    ? 'text-cobalt'
                    : conn.status === 'Needs attention'
                      ? 'text-warning'
                      : 'text-muted-foreground'
                }
                strokeWidth={1.8}
              />
            )}
          </div>
          <div className="flex-1">
            <p className="text-[0.9rem]" style={{ fontWeight: 600 }}>
              {conn.name}
            </p>
            <StatusPill status={conn.status} />
          </div>
        </div>
        {conn.last_sync && (
          <p className="text-[0.78rem] text-muted-foreground mb-3">
            {conn.status === 'Syncing' ? 'Syncing now…' : `Last synced ${conn.last_sync}`}
          </p>
        )}
        {conn.status === 'Needs attention' && (
          <div className="p-2.5 bg-warning-light rounded-lg mb-3 flex items-center gap-2">
            <AlertCircle size={14} className="text-warning" />
            <span className="text-[0.78rem] text-warning" style={{ fontWeight: 500 }}>
              Auth expired - reconnect required
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {conn.status === 'Not connected' ? (
            <button
              onClick={async () => {
                setIsConnecting(conn.id);
                await connectAccount(conn.id);
                setIsConnecting(null);
                toast.success(`${conn.name} connected successfully`);
              }}
              disabled={isConnecting === conn.id}
              className="h-8 px-4 rounded-xl bg-cobalt text-white text-[0.8rem] hover:bg-cobalt-dark cursor-pointer flex-1 disabled:opacity-50"
              style={{ fontWeight: 500 }}
            >
              {isConnecting === conn.id ? 'Connecting...' : 'Connect'}
            </button>
          ) : conn.status === 'Needs attention' ? (
            <button
              onClick={async () => {
                setIsConnecting(conn.id);
                await connectAccount(conn.id);
                setIsConnecting(null);
                toast.success(`${conn.name} reconnected successfully`);
              }}
              disabled={isConnecting === conn.id}
              className="h-8 px-4 rounded-xl bg-warning text-white text-[0.8rem] hover:bg-warning/90 cursor-pointer flex-1 disabled:opacity-50"
              style={{ fontWeight: 500 }}
            >
              {isConnecting === conn.id ? 'Reconnecting...' : 'Reconnect'}
            </button>
          ) : (
            <button
              onClick={() => setManageConnectionId(conn.id)}
              className="h-8 px-4 rounded-xl border border-border text-[0.8rem] text-foreground hover:bg-accent cursor-pointer flex-1 flex items-center justify-center gap-1.5"
              style={{ fontWeight: 500 }}
            >
              <Settings size={13} /> Manage
            </button>
          )}
        </div>
      </div>
    );
  };

  const ProviderTile = ({
    definition,
    account,
  }: {
    definition: ProviderDefinition;
    account: IntegrationAccount | null;
  }) => {
    const Icon = iconMap[definition.logo] || Store;
    const isSyncing = account ? syncingIntegrationId === account.id : false;
    const status = account
      ? mapProviderStatusToConnectionStatus(account.status, isSyncing)
      : 'Not connected';

    return (
      <div className="bg-white rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
              status === 'Connected'
                ? 'bg-cobalt-light'
                : status === 'Needs attention'
                  ? 'bg-warning-light'
                  : status === 'Syncing'
                    ? 'bg-cobalt-light'
                    : 'bg-[#F3F4F6]'
            }`}
          >
            {status === 'Syncing' ? (
              <Loader2 size={18} className="text-cobalt animate-spin" />
            ) : (
              <Icon
                size={18}
                className={
                  status === 'Connected'
                    ? 'text-cobalt'
                    : status === 'Needs attention'
                      ? 'text-warning'
                      : 'text-muted-foreground'
                }
                strokeWidth={1.8}
              />
            )}
          </div>
          <div className="flex-1">
            <p className="text-[0.9rem]" style={{ fontWeight: 600 }}>
              {account?.display_name || definition.defaultName}
            </p>
            <StatusPill status={status} />
          </div>
        </div>

        <p className="text-[0.78rem] text-muted-foreground mb-2">{definition.description}</p>
        <p className="text-[0.78rem] text-muted-foreground mb-3">
          {account ? `Last synced ${formatProviderLastSync(account.last_synced_at)}` : 'Not connected yet'}
        </p>

        {account?.last_error && (
          <div className="p-2.5 bg-warning-light rounded-lg mb-3 flex items-center gap-2">
            <AlertCircle size={14} className="text-warning" />
            <span className="text-[0.78rem] text-warning" style={{ fontWeight: 500 }}>
              {account.last_error}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {!account ? (
            <button
              onClick={() => openCredentialModal(definition.provider, null)}
              className="h-8 px-4 rounded-xl bg-cobalt text-white text-[0.8rem] hover:bg-cobalt-dark cursor-pointer flex-1"
              style={{ fontWeight: 500 }}
            >
              Connect
            </button>
          ) : account.status === 'error' ? (
            <button
              onClick={() => openCredentialModal(definition.provider, account)}
              className="h-8 px-4 rounded-xl bg-warning text-white text-[0.8rem] hover:bg-warning/90 cursor-pointer flex-1"
              style={{ fontWeight: 500 }}
            >
              Reconnect
            </button>
          ) : (
            <button
              onClick={() => setManageIntegrationId(account.id)}
              className="h-8 px-4 rounded-xl border border-border text-[0.8rem] text-foreground hover:bg-accent cursor-pointer flex-1 flex items-center justify-center gap-1.5"
              style={{ fontWeight: 500 }}
            >
              <Settings size={13} /> Manage
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-foreground">Connections</h2>
          <p className="text-[0.85rem] text-muted-foreground">
            {totalConnected} connected{' '}
            {totalNeedsAttention > 0 && (
              <>
                · <span className="text-warning">{totalNeedsAttention} need attention</span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={syncAllProviders}
          disabled={refreshingProviders}
          className="h-9 px-4 rounded-xl bg-cobalt text-white text-[0.82rem] hover:bg-cobalt-dark cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          style={{ fontWeight: 500 }}
        >
          <RefreshCw size={14} className={refreshingProviders ? 'animate-spin' : ''} />
          {refreshingProviders ? 'Syncing providers...' : 'Sync providers now'}
        </button>
      </div>

      <div className="bg-cobalt-light border border-cobalt/20 rounded-2xl p-5 mb-6 flex items-center gap-4 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-cobalt flex items-center justify-center flex-shrink-0">
          <Mail size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-[0.9rem] text-cobalt-dark" style={{ fontWeight: 600 }}>
            Forwarding Address
          </p>
          <p className="text-[0.85rem] text-cobalt-dark/70">
            Forward receipts to{' '}
            <span className="font-mono" style={{ fontWeight: 500 }}>
              receipts@unify.app
            </span>
          </p>
        </div>
        <button
          onClick={() => copy('receipts@unify.app', 'Forwarding address copied')}
          className="h-8 px-4 rounded-xl bg-cobalt text-white text-[0.8rem] cursor-pointer"
          style={{ fontWeight: 500 }}
        >
          Copy address
        </button>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground flex items-center gap-2">
            <Shield size={18} className="text-cobalt" /> Provider Integrations
          </h3>
          <button
            onClick={() => void loadIntegrations()}
            className="h-8 px-3 rounded-xl border border-border text-[0.8rem] text-muted-foreground hover:bg-accent cursor-pointer"
            style={{ fontWeight: 500 }}
          >
            Refresh statuses
          </button>
        </div>

        {integrationError && (
          <div className="p-3 rounded-xl border border-warning/30 bg-warning-light text-warning text-[0.82rem] mb-4">
            {integrationError}
          </div>
        )}

        {loadingIntegrations ? (
          <div className="bg-white rounded-2xl border border-border p-8 flex items-center justify-center">
            <Loader2 size={20} className="text-cobalt animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providerCards.map(({ definition, account }) => (
              <ProviderTile
                key={definition.provider}
                definition={definition}
                account={account}
              />
            ))}
          </div>
        )}
      </div>

      {emailConns.length > 0 && (
        <div className="mb-8">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <Mail size={18} className="text-cobalt" /> Email
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {emailConns.map((conn) => (
              <ConnTile key={conn.id} conn={conn} />
            ))}
          </div>
        </div>
      )}

      {merchantConns.length > 0 && (
        <div className="mb-8">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <ShoppingCart size={18} className="text-cobalt" /> Merchants
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {merchantConns.map((conn) => (
              <ConnTile key={conn.id} conn={conn} />
            ))}
          </div>
        </div>
      )}

      {carrierConns.length > 0 && (
        <div className="mb-8">
          <h3 className="text-foreground mb-4 flex items-center gap-2">
            <Truck size={18} className="text-cobalt" /> Carriers
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {carrierConns.map((conn) => (
              <ConnTile key={conn.id} conn={conn} />
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-foreground mb-4 flex items-center gap-2">
          <Upload size={18} className="text-cobalt" /> File Import
        </h3>
        <FileUpload
          onUpload={(files) => {
            toast.success(`${files.length} file(s) uploaded successfully`);
          }}
          multiple
        />
      </div>

      <div className="bg-white rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={16} className="text-cobalt" />
          <span style={{ fontWeight: 600 }}>Why didn't my order appear?</span>
        </div>
        <div className="space-y-2">
          {[
            'Check that your provider integration is active and synced',
            'Verify your API keys are valid and not expired',
            "Confirm webhook secrets match your provider's webhook settings",
            'Try a manual sync from this page after updating credentials',
          ].map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-muted-foreground/40 mt-0.5 flex-shrink-0" />
              <span className="text-[0.85rem] text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {managedConn && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setManageConnectionId(null)} />
          <div className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden mx-4">
            <div className="flex items-center justify-between px-5 h-14 border-b border-border">
              <span style={{ fontWeight: 600 }}>Manage {managedConn.name}</span>
              <button
                onClick={() => setManageConnectionId(null)}
                className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-muted-foreground" />
                <span className="text-[0.85rem] text-muted-foreground">
                  Permissions: Read-only access to order data
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[0.85rem] text-muted-foreground">Last sync</span>
                <span className="text-[0.85rem]">{managedConn.last_sync}</span>
              </div>
              {managedConn.data_scope && (
                <div className="flex justify-between">
                  <span className="text-[0.85rem] text-muted-foreground">Data scope</span>
                  <span className="text-[0.85rem]">{managedConn.data_scope}</span>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={async () => {
                    setIsConnectionResyncing(managedConn.id);
                    await updateConnection(managedConn.id, {
                      status: 'Syncing',
                      last_sync: 'Syncing now…',
                    });
                    setTimeout(async () => {
                      await updateConnection(managedConn.id, {
                        status: 'Connected',
                        last_sync: 'Just now',
                      });
                      setIsConnectionResyncing(null);
                      toast.success(`${managedConn.name} synced successfully`);
                    }, 1200);
                  }}
                  disabled={isConnectionResyncing === managedConn.id}
                  className="flex-1 h-9 rounded-xl bg-cobalt text-white text-[0.85rem] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  style={{ fontWeight: 500 }}
                >
                  <RefreshCw
                    size={13}
                    className={isConnectionResyncing === managedConn.id ? 'animate-spin' : ''}
                  />
                  {isConnectionResyncing === managedConn.id ? 'Syncing...' : 'Resync now'}
                </button>
                <button
                  onClick={() => {
                    updateConnection(managedConn.id, { status: 'Not connected' });
                    toast.success(`${managedConn.name} paused`);
                    setManageConnectionId(null);
                  }}
                  className="h-9 px-4 rounded-xl border border-border text-[0.85rem] text-muted-foreground cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  Pause
                </button>
                <button
                  onClick={() => {
                    setDisconnectTarget({ type: 'connection', id: managedConn.id });
                    setDisconnectModalOpen(true);
                  }}
                  className="h-9 px-4 rounded-xl border border-danger/30 text-[0.85rem] text-danger cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog open={Boolean(managedIntegration)} onOpenChange={() => setManageIntegrationId(null)}>
        <DialogContent className="max-w-lg">
          {managedIntegration && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Manage{' '}
                  {managedIntegration.display_name ||
                    providerMap[managedIntegration.provider].defaultName}
                </DialogTitle>
                <DialogDescription>
                  Provider: {providerMap[managedIntegration.provider].defaultName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-[0.85rem]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusPill
                    status={mapProviderStatusToConnectionStatus(
                      managedIntegration.status,
                      syncingIntegrationId === managedIntegration.id
                    )}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last synced</span>
                  <span>{formatProviderLastSync(managedIntegration.last_synced_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Refresh interval</span>
                  <span>{managedIntegration.refresh_interval_minutes} min</span>
                </div>
                {managedIntegration.last_error && (
                  <div className="rounded-xl border border-warning/30 bg-warning-light text-warning p-2.5">
                    {managedIntegration.last_error}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => void syncOneIntegration(managedIntegration)}
                  disabled={syncingIntegrationId === managedIntegration.id}
                  className="h-9 rounded-xl bg-cobalt text-white text-[0.82rem] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ fontWeight: 500 }}
                >
                  <RefreshCw
                    size={13}
                    className={syncingIntegrationId === managedIntegration.id ? 'animate-spin' : ''}
                  />
                  {syncingIntegrationId === managedIntegration.id ? 'Syncing...' : 'Resync now'}
                </button>
                <button
                  onClick={() => void toggleIntegrationStatus(managedIntegration)}
                  className="h-9 rounded-xl border border-border text-[0.82rem] cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  {managedIntegration.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={() =>
                    openCredentialModal(managedIntegration.provider, managedIntegration)
                  }
                  className="h-9 rounded-xl border border-border text-[0.82rem] cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  Edit credentials
                </button>
                <button
                  onClick={() => {
                    setDisconnectTarget({ type: 'integration', id: managedIntegration.id });
                    setDisconnectModalOpen(true);
                  }}
                  className="h-9 rounded-xl border border-danger/30 text-danger text-[0.82rem] cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  Disconnect
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(credentialModal && credentialDefinition)} onOpenChange={closeCredentialModal}>
        <DialogContent className="max-w-xl">
          {credentialDefinition && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {credentialAccount ? 'Update' : 'Connect'} {credentialDefinition.defaultName}
                </DialogTitle>
                <DialogDescription>
                  Credentials are stored server-side and used by secure edge sync jobs.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={saveIntegrationCredentials} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[0.82rem] text-muted-foreground mb-1.5 block">
                      Display Name
                    </label>
                    <input
                      value={credentialForm.display_name || ''}
                      onChange={(event) => updateCredentialForm('display_name', event.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
                      placeholder={credentialDefinition.defaultName}
                    />
                  </div>
                  <div>
                    <label className="text-[0.82rem] text-muted-foreground mb-1.5 block">
                      {credentialDefinition.externalIdLabel}
                    </label>
                    <input
                      value={credentialForm.external_account_id || ''}
                      onChange={(event) =>
                        updateCredentialForm('external_account_id', event.target.value)
                      }
                      className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
                      placeholder={credentialDefinition.externalIdPlaceholder}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[0.82rem] text-muted-foreground mb-1.5 block">
                    Refresh Interval (minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={credentialForm.refresh_interval_minutes || '60'}
                    onChange={(event) =>
                      updateCredentialForm('refresh_interval_minutes', event.target.value)
                    }
                    className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
                  />
                </div>

                <div className="border border-border rounded-xl p-3">
                  <p className="text-[0.83rem] mb-2" style={{ fontWeight: 600 }}>
                    Secrets
                  </p>
                  <div className="space-y-3">
                    {credentialDefinition.secretFields.map((field) => (
                      <div key={field.key}>
                        <label className="text-[0.8rem] text-muted-foreground mb-1.5 block">
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          value={credentialForm[field.key] || ''}
                          onChange={(event) => updateCredentialForm(field.key, event.target.value)}
                          className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {credentialDefinition.configFields.length > 0 && (
                  <div className="border border-border rounded-xl p-3">
                    <p className="text-[0.83rem] mb-2" style={{ fontWeight: 600 }}>
                      Config
                    </p>
                    <div className="space-y-3">
                      {credentialDefinition.configFields.map((field) => (
                        <div key={field.key}>
                          <label className="text-[0.8rem] text-muted-foreground mb-1.5 block">
                            {field.label}
                          </label>
                          {field.type === 'select' ? (
                            <select
                              value={credentialForm[field.key] || field.options?.[0] || ''}
                              onChange={(event) =>
                                updateCredentialForm(field.key, event.target.value)
                              }
                              className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt cursor-pointer"
                            >
                              {(field.options || []).map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type}
                              value={credentialForm[field.key] || ''}
                              onChange={(event) => updateCredentialForm(field.key, event.target.value)}
                              className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
                              placeholder={field.placeholder}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeCredentialModal}
                    className="h-9 px-4 rounded-xl border border-border text-[0.85rem] text-muted-foreground hover:bg-accent cursor-pointer flex-1"
                    style={{ fontWeight: 500 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCredentials}
                    className="h-9 px-4 rounded-xl bg-cobalt text-white text-[0.85rem] hover:bg-cobalt-dark cursor-pointer flex-1 disabled:opacity-50"
                    style={{ fontWeight: 500 }}
                  >
                    {savingCredentials ? 'Saving...' : credentialAccount ? 'Update integration' : 'Connect integration'}
                  </button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        open={disconnectModalOpen}
        onClose={() => {
          setDisconnectModalOpen(false);
          setDisconnectTarget(null);
        }}
        onConfirm={() => {
          void confirmDisconnect();
        }}
        title="Disconnect Account"
        description="Are you sure you want to disconnect this account? You can reconnect it anytime."
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
