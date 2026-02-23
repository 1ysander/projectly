import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  UnifiedOrder,
  UnifiedReturn,
  Shipment,
  Connection,
  Notification,
  InboxItem,
  Automation,
} from '../data/mock-data';
import { useAuth } from './AuthContext';
import * as ordersDb from '../../lib/db/orders';
import * as returnsDb from '../../lib/db/returns';
import * as shipmentsDb from '../../lib/db/shipments';
import * as connectionsDb from '../../lib/db/connections';
import * as notificationsDb from '../../lib/db/notifications';
import * as settingsDb from '../../lib/db/settings';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export interface UserSettings {
  name: string;
  email: string;
  defaultCurrency: string;
  notifications: {
    deliveryAlerts: boolean;
    returnDeadlineReminders: boolean;
    refundUpdates: boolean;
    newOrderDetected: boolean;
    lowConfidenceMatches: boolean;
    weeklySummary: boolean;
    channels: {
      inApp: boolean;
      email: boolean;
      push: boolean;
    };
  };
  privacy: {
    showDeliveryAddressDetails: boolean;
    autoDetectOrdersFromEmail: boolean;
    autoLinkTrackingNumbers: boolean;
    returnDeadlineReminders: boolean;
    emailScanScope: 'all' | 'labeled' | 'forwarded';
  };
  security: {
    twoFactorEnabled: boolean;
  };
}

const defaultSettings: UserSettings = {
  name: '',
  email: '',
  defaultCurrency: 'USD',
  notifications: {
    deliveryAlerts: true,
    returnDeadlineReminders: true,
    refundUpdates: true,
    newOrderDetected: true,
    lowConfidenceMatches: true,
    weeklySummary: false,
    channels: {
      inApp: true,
      email: false,
      push: false,
    },
  },
  privacy: {
    showDeliveryAddressDetails: false,
    autoDetectOrdersFromEmail: true,
    autoLinkTrackingNumbers: true,
    returnDeadlineReminders: true,
    emailScanScope: 'all',
  },
  security: {
    twoFactorEnabled: false,
  },
};

function normalizeSettings(
  rawSettings: UserSettings | null,
  fallbackName: string,
  fallbackEmail: string
): UserSettings {
  return {
    ...defaultSettings,
    ...rawSettings,
    name: rawSettings?.name || fallbackName,
    email: rawSettings?.email || fallbackEmail,
    notifications: {
      ...defaultSettings.notifications,
      ...(rawSettings?.notifications || {}),
      channels: {
        ...defaultSettings.notifications.channels,
        ...(rawSettings?.notifications?.channels || {}),
      },
    },
    privacy: {
      ...defaultSettings.privacy,
      ...(rawSettings?.privacy || {}),
    },
    security: {
      ...defaultSettings.security,
      ...(rawSettings?.security || {}),
    },
  };
}

interface AppState {
  orders: UnifiedOrder[];
  returns: UnifiedReturn[];
  shipments: Shipment[];
  connections: Connection[];
  notifications: Notification[];
  inboxItems: InboxItem[];
  automations: Automation[];
  settings: UserSettings;
  onboardingCompleted: boolean;
  loading: boolean;
  refreshing: boolean;
  lastRefreshedAt: string | null;
}

interface AppContextType extends AppState {
  // Orders
  addOrder: (order: Omit<UnifiedOrder, 'order_id'>) => Promise<void>;
  updateOrder: (id: string, updates: Partial<UnifiedOrder>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  
  // Returns
  addReturn: (returnItem: Omit<UnifiedReturn, 'return_id'>) => Promise<void>;
  updateReturn: (id: string, updates: Partial<UnifiedReturn>) => Promise<void>;
  deleteReturn: (id: string) => Promise<void>;
  
  // Shipments
  addShipment: (shipment: Omit<Shipment, 'shipment_id'>) => Promise<void>;
  updateShipment: (id: string, updates: Partial<Shipment>) => Promise<void>;
  deleteShipment: (id: string) => Promise<void>;
  linkShipmentToOrder: (shipmentId: string, orderId: string) => Promise<void>;
  
  // Connections
  updateConnection: (id: string, updates: Partial<Connection>) => Promise<void>;
  connectAccount: (id: string) => Promise<void>;
  disconnectAccount: (id: string) => Promise<void>;
  
  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id'>) => Promise<void>;
  
  // Inbox
  markInboxItemRead: (id: string) => void;
  
  // Settings
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  
  // Onboarding
  completeOnboarding: () => Promise<void>;
  
  // Data export/delete
  exportData: () => void;
  deleteAllData: () => Promise<void>;
  
  // Refresh data
  reloadData: () => Promise<boolean>;
  refreshData: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AppState>({
    orders: [],
    returns: [],
    shipments: [],
    connections: [],
    notifications: [],
    inboxItems: [],
    automations: [],
    settings: defaultSettings,
    onboardingCompleted: false,
    loading: true,
    refreshing: false,
    lastRefreshedAt: null,
  });

  const syncExternalProviders = async (mode: 'manual' | 'open' | 'scheduled') => {
    if (!user?.id) return false;
    try {
      const { data, error } = await supabase.functions.invoke('sync-integrations', {
        body: { mode },
      });
      if (error) {
        console.warn('External provider sync failed:', error.message || error);
        return false;
      }
      if (data && typeof data === 'object' && 'ok' in data && !data.ok) {
        console.warn('External provider sync returned non-ok payload:', data);
        return false;
      }
      return true;
    } catch (error) {
      console.warn('External provider sync threw an error:', error);
      return false;
    }
  };

  const loadData = async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? true;

    // Safety check: don't load data if user is not authenticated
    // Note: authLoading check is handled in useEffect, this is just a double-check
    if (!user?.id) {
      setState((prev) => ({ ...prev, loading: false, refreshing: false }));
      return false;
    }

    try {
      if (showLoading) {
        setState((prev) => ({ ...prev, loading: true }));
      }

      // All queries now handle errors gracefully and return empty arrays/null
      // So they should complete quickly even if tables don't exist
      const [orders, returns, shipments, connections, notifications, settings] = await Promise.all([
        ordersDb.getOrders(user.id),
        returnsDb.getReturns(user.id),
        shipmentsDb.getShipments(user.id),
        connectionsDb.getConnections(user.id),
        notificationsDb.getNotifications(user.id),
        settingsDb.getSettings(user.id),
      ]);

      const onboardingCompleted = await settingsDb.getOnboardingStatus(user.id);

      setState((prev) => ({
        ...prev,
        orders,
        returns,
        shipments,
        connections,
        notifications,
        settings: normalizeSettings(
          settings,
          user.user_metadata?.name || user.email || '',
          user.email || ''
        ),
        onboardingCompleted,
        loading: false,
        refreshing: false,
        lastRefreshedAt: new Date().toISOString(),
      }));
      return true;
    } catch (error) {
      console.error('Failed to load data:', error);
      // Set loading to false and use empty data
      // Individual queries handle their own errors, so this should rarely happen
      setState((prev) => ({
        ...prev,
        orders: [],
        returns: [],
        shipments: [],
        connections: [],
        notifications: [],
        settings: normalizeSettings(
          prev.settings || null,
          user?.user_metadata?.name || user?.email || '',
          user?.email || ''
        ),
        onboardingCompleted: false,
        loading: false,
        refreshing: false,
        lastRefreshedAt: new Date().toISOString(),
      }));
      return false;
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading before doing anything
    if (authLoading) {
      return;
    }

    // Don't do anything if user is not authenticated
    if (!user?.id) {
      // Clear state when user logs out or is not authenticated
      setState({
        orders: [],
        returns: [],
        shipments: [],
        connections: [],
        notifications: [],
        inboxItems: [],
        automations: [],
        settings: defaultSettings,
        onboardingCompleted: false,
        loading: false,
        refreshing: false,
        lastRefreshedAt: null,
      });
      return;
    }

    // Only load data if user is authenticated
    void loadData();
    // Also trigger a background provider sync at app open.
    void (async () => {
      await syncExternalProviders('open');
      await loadData({ showLoading: false });
    })();

    // Set up realtime subscriptions
    const ordersChannel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` }, () => {
        void loadData({ showLoading: false });
      })
      .subscribe();

    const returnsChannel = supabase
      .channel('returns-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'returns', filter: `user_id=eq.${user.id}` }, () => {
        void loadData({ showLoading: false });
      })
      .subscribe();

    const shipmentsChannel = supabase
      .channel('shipments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments', filter: `user_id=eq.${user.id}` }, () => {
        void loadData({ showLoading: false });
      })
      .subscribe();

    // Refresh on app reopen and hourly while app stays open.
    const refreshVisibleData = () => {
      if (document.visibilityState === 'visible') {
        void (async () => {
          await syncExternalProviders('scheduled');
          await loadData({ showLoading: false });
        })();
      }
    };
    const hourlyRefresh = window.setInterval(refreshVisibleData, 60 * 60 * 1000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshVisibleData();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(returnsChannel);
      supabase.removeChannel(shipmentsChannel);
      window.clearInterval(hourlyRefresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user?.id, authLoading]);

  // Orders
  const addOrder = async (order: Omit<UnifiedOrder, 'order_id'>) => {
    if (!user?.id) return;
    try {
      await ordersDb.createOrder(user.id, order);
      await loadData();
      toast.success('Order added');
    } catch (error) {
      console.error('Failed to add order:', error);
      toast.error('Failed to add order');
    }
  };

  const updateOrder = async (id: string, updates: Partial<UnifiedOrder>) => {
    if (!user?.id) return;
    try {
      await ordersDb.updateOrder(user.id, id, updates);
      await loadData();
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('Failed to update order');
    }
  };

  const deleteOrder = async (id: string) => {
    if (!user?.id) return;
    try {
      await ordersDb.deleteOrder(user.id, id);
      await loadData();
      toast.success('Order deleted');
    } catch (error) {
      console.error('Failed to delete order:', error);
      toast.error('Failed to delete order');
    }
  };

  // Returns
  const addReturn = async (returnItem: Omit<UnifiedReturn, 'return_id'>) => {
    if (!user?.id) return;
    try {
      await returnsDb.createReturn(user.id, returnItem);
      await loadData();
      toast.success('Return added');
    } catch (error) {
      console.error('Failed to add return:', error);
      toast.error('Failed to add return');
    }
  };

  const updateReturn = async (id: string, updates: Partial<UnifiedReturn>) => {
    if (!user?.id) return;
    try {
      await returnsDb.updateReturn(user.id, id, updates);
      await loadData();
    } catch (error) {
      console.error('Failed to update return:', error);
      toast.error('Failed to update return');
    }
  };

  const deleteReturn = async (id: string) => {
    if (!user?.id) return;
    try {
      await returnsDb.deleteReturn(user.id, id);
      await loadData();
      toast.success('Return deleted');
    } catch (error) {
      console.error('Failed to delete return:', error);
      toast.error('Failed to delete return');
    }
  };

  // Shipments
  const addShipment = async (shipment: Omit<Shipment, 'shipment_id'>) => {
    if (!user?.id) return;
    try {
      await shipmentsDb.createShipment(user.id, shipment);
      await loadData();
      toast.success('Shipment added');
    } catch (error) {
      console.error('Failed to add shipment:', error);
      toast.error('Failed to add shipment');
    }
  };

  const updateShipment = async (id: string, updates: Partial<Shipment>) => {
    if (!user?.id) return;
    try {
      await shipmentsDb.updateShipment(user.id, id, updates);
      await loadData();
    } catch (error) {
      console.error('Failed to update shipment:', error);
      toast.error('Failed to update shipment');
    }
  };

  const deleteShipment = async (id: string) => {
    if (!user?.id) return;
    try {
      await shipmentsDb.deleteShipment(user.id, id);
      await loadData();
      toast.success('Shipment deleted');
    } catch (error) {
      console.error('Failed to delete shipment:', error);
      toast.error('Failed to delete shipment');
    }
  };

  const linkShipmentToOrder = async (shipmentId: string, orderId: string) => {
    if (!user?.id) return;
    const order = state.orders.find((o) => o.order_id === orderId);
    if (order) {
      await updateShipment(shipmentId, {
        linked_order_id: orderId,
        merchant_name: order.merchant_name,
      });
    }
  };

  // Connections
  const updateConnection = async (id: string, updates: Partial<Connection>) => {
    if (!user?.id) return;
    try {
      await connectionsDb.updateConnection(user.id, id, updates);
      await loadData();
    } catch (error) {
      console.error('Failed to update connection:', error);
      toast.error('Failed to update connection');
    }
  };

  const connectAccount = async (id: string) => {
    await updateConnection(id, {
      status: 'Connected',
      last_sync: 'Just now',
    });
  };

  const disconnectAccount = async (id: string) => {
    if (!user?.id) return;
    try {
      await connectionsDb.deleteConnection(user.id, id);
      await loadData();
    } catch (error) {
      console.error('Failed to disconnect account:', error);
      toast.error('Failed to disconnect account');
    }
  };

  // Notifications
  const markNotificationRead = async (id: string) => {
    if (!user?.id) return;
    try {
      await notificationsDb.markNotificationAsRead(user.id, id);
      await loadData();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user?.id) return;
    try {
      await notificationsDb.markAllNotificationsAsRead(user.id);
      await loadData();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const addNotification = async (notification: Omit<Notification, 'id'>) => {
    if (!user?.id) return;
    try {
      await notificationsDb.createNotification(user.id, notification);
      await loadData();
    } catch (error) {
      console.error('Failed to add notification:', error);
    }
  };

  // Inbox
  const markInboxItemRead = (id: string) => {
    setState((prev) => ({
      ...prev,
      inboxItems: prev.inboxItems.map((i) => (i.id === id ? { ...i, read: true } : i)),
    }));
  };

  // Settings
  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user?.id) return;
    try {
      await settingsDb.updateSettings(user.id, updates);
      await loadData();
      toast.success('Settings updated');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    }
  };

  // Onboarding
  const completeOnboarding = async () => {
    if (!user?.id) return;
    try {
      await settingsDb.setOnboardingCompleted(user.id, true);
      setState((prev) => ({ ...prev, onboardingCompleted: true }));
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  // Data export/delete
  const exportData = () => {
    const data = {
      orders: state.orders,
      returns: state.returns,
      shipments: state.shipments,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unify-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  const deleteAllData = async () => {
    if (!user?.id) return;
    try {
      // Delete all user data
      await Promise.all([
        ...state.orders.map((o) => ordersDb.deleteOrder(user.id, o.order_id)),
        ...state.returns.map((r) => returnsDb.deleteReturn(user.id, r.return_id)),
        ...state.shipments.map((s) => shipmentsDb.deleteShipment(user.id, s.shipment_id)),
        ...state.connections.map((c) => connectionsDb.deleteConnection(user.id, c.id)),
      ]);
      await loadData();
      toast.success('All data deleted');
    } catch (error) {
      console.error('Failed to delete all data:', error);
      toast.error('Failed to delete all data');
    }
  };

  const refreshData = async () => {
    setState((prev) => ({ ...prev, refreshing: true }));
    await syncExternalProviders('manual');
    return loadData({ showLoading: false });
  };

  const reloadData = async () => {
    return loadData({ showLoading: false });
  };

  const value: AppContextType = {
    ...state,
    addOrder,
    updateOrder,
    deleteOrder,
    addReturn,
    updateReturn,
    deleteReturn,
    addShipment,
    updateShipment,
    deleteShipment,
    linkShipmentToOrder,
    updateConnection,
    connectAccount,
    disconnectAccount,
    markNotificationRead,
    markAllNotificationsRead,
    addNotification,
    markInboxItemRead,
    updateSettings,
    completeOnboarding,
    exportData,
    deleteAllData,
    reloadData,
    refreshData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}

// Convenience hooks
export function useOrders() {
  const { orders, addOrder, updateOrder, deleteOrder } = useAppState();
  return { orders, addOrder, updateOrder, deleteOrder };
}

export function useReturns() {
  const { returns, addReturn, updateReturn, deleteReturn } = useAppState();
  return { returns, addReturn, updateReturn, deleteReturn };
}

export function useShipments() {
  const { shipments, addShipment, updateShipment, deleteShipment, linkShipmentToOrder } = useAppState();
  return { shipments, addShipment, updateShipment, deleteShipment, linkShipmentToOrder };
}

export function useConnections() {
  const { connections, updateConnection, connectAccount, disconnectAccount, reloadData } = useAppState();
  return { connections, updateConnection, connectAccount, disconnectAccount, reloadData };
}

export function useNotifications() {
  const { notifications, markNotificationRead, markAllNotificationsRead, addNotification } = useAppState();
  return { notifications, markNotificationRead, markAllNotificationsRead, addNotification };
}

export function useSettings() {
  const { settings, updateSettings } = useAppState();
  return { settings, updateSettings };
}
