import { supabase } from '../supabase';
import { Notification } from '../../app/data/mock-data';

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  timestamp: string;
  action: string;
  read: boolean;
  created_at: string;
}

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    title: row.title,
    timestamp: row.timestamp,
    action: row.action,
    read: row.read,
  };
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    return (data || []).map(rowToNotification);
  } catch (error) {
    console.error('Unexpected error in getNotifications:', error);
    return [];
  }
}

export async function createNotification(userId: string, notification: Omit<Notification, 'id'>): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title: notification.title,
      timestamp: notification.timestamp,
      action: notification.action,
      read: notification.read,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToNotification(data);
}

export async function updateNotification(
  userId: string,
  notificationId: string,
  updates: Partial<Omit<Notification, 'id'>>
): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .update(updates)
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return rowToNotification(data);
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  await updateNotification(userId, notificationId, { read: true });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;
}

export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) throw error;
}
