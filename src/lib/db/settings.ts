import { supabase } from '../supabase';
import { UserSettings } from '../../app/context/AppContext';

export interface SettingsRow {
  id: string;
  user_id: string;
  name: string;
  default_currency: string;
  notifications: any;
  privacy: any;
  security: any;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

function rowToSettings(row: SettingsRow): UserSettings {
  return {
    name: row.name,
    email: '', // Email comes from auth.users
    defaultCurrency: row.default_currency,
    notifications: row.notifications || {},
    privacy: row.privacy || {},
    security: row.security || {},
  };
}

export async function getSettings(userId: string): Promise<UserSettings | null> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return null;
      }
      console.error('Error fetching settings:', error);
      return null; // Return null instead of throwing for better UX
    }
    return data ? rowToSettings(data) : null;
  } catch (error) {
    console.error('Unexpected error in getSettings:', error);
    return null;
  }
}

export async function createSettings(userId: string, name: string, email: string): Promise<UserSettings> {
  const defaultSettings: UserSettings = {
    name,
    email,
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

  const { data, error } = await supabase
    .from('user_settings')
    .insert({
      user_id: userId,
      name,
      default_currency: defaultSettings.defaultCurrency,
      notifications: defaultSettings.notifications,
      privacy: defaultSettings.privacy,
      security: defaultSettings.security,
      onboarding_completed: false,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToSettings(data);
}

export async function updateSettings(
  userId: string,
  updates: Partial<UserSettings>
): Promise<UserSettings> {
  const updateData: any = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.defaultCurrency !== undefined) updateData.default_currency = updates.defaultCurrency;
  if (updates.notifications !== undefined) updateData.notifications = updates.notifications;
  if (updates.privacy !== undefined) updateData.privacy = updates.privacy;
  if (updates.security !== undefined) updateData.security = updates.security;

  const { data, error } = await supabase
    .from('user_settings')
    .update(updateData)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return rowToSettings(data);
}

export async function setOnboardingCompleted(userId: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .update({ onboarding_completed: completed })
    .eq('user_id', userId);

  if (error) throw error;
}

export async function getOnboardingStatus(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('onboarding_completed')
      .eq('user_id', userId)
      .maybeSingle();

    // If no row exists or error, return false (onboarding not completed)
    // Don't create settings here - let AuthContext handle that
    if (error || !data) {
      if (error && error.code !== 'PGRST116' && error.code !== '42P01' && !error.message?.includes('relation') && !error.message?.includes('does not exist')) {
        console.error('Error fetching onboarding status:', error);
      }
      return false;
    }
    return data.onboarding_completed || false;
  } catch (error) {
    console.error('Unexpected error in getOnboardingStatus:', error);
    return false;
  }
}
