import { supabase } from '../supabase';
import { UnifiedOrder, OrderItem, ShipmentLink } from '../../app/data/mock-data';

export interface OrderRow {
  id: string;
  user_id: string;
  order_number: string;
  merchant_name: string;
  merchant_logo?: string;
  source: string;
  order_date: string;
  total_amount: number;
  currency: string;
  payment_method?: string;
  items: OrderItem[];
  shipment_links: ShipmentLink[];
  return_window_end_date?: string;
  tags: string[];
  notes: string;
  status: string;
  confidence_score?: number;
  created_at: string;
  updated_at: string;
}

function rowToOrder(row: OrderRow): UnifiedOrder {
  return {
    order_id: row.id,
    merchant_name: row.merchant_name,
    merchant_logo: row.merchant_logo,
    source: row.source as UnifiedOrder['source'],
    order_number: row.order_number,
    order_date: row.order_date,
    total_amount: Number(row.total_amount),
    currency: row.currency,
    payment_method: row.payment_method || '',
    items: row.items || [],
    shipment_links: row.shipment_links || [],
    return_window_end_date: row.return_window_end_date,
    tags: row.tags || [],
    notes: row.notes || '',
    status: row.status as UnifiedOrder['status'],
    confidence_score: row.confidence_score ? Number(row.confidence_score) : undefined,
  };
}

export async function getOrders(userId: string): Promise<UnifiedOrder[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('order_date', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      // Return empty array instead of throwing for missing tables or RLS issues
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    return (data || []).map(rowToOrder);
  } catch (error) {
    console.error('Unexpected error in getOrders:', error);
    return [];
  }
}

export async function getOrderById(userId: string, orderId: string): Promise<UnifiedOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? rowToOrder(data) : null;
}

export async function createOrder(userId: string, order: Omit<UnifiedOrder, 'order_id'>): Promise<UnifiedOrder> {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      order_number: order.order_number,
      merchant_name: order.merchant_name,
      merchant_logo: order.merchant_logo,
      source: order.source,
      order_date: order.order_date,
      total_amount: order.total_amount,
      currency: order.currency,
      payment_method: order.payment_method,
      items: order.items,
      shipment_links: order.shipment_links,
      return_window_end_date: order.return_window_end_date,
      tags: order.tags,
      notes: order.notes,
      status: order.status,
      confidence_score: order.confidence_score,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToOrder(data);
}

export async function updateOrder(
  userId: string,
  orderId: string,
  updates: Partial<Omit<UnifiedOrder, 'order_id'>>
): Promise<UnifiedOrder> {
  const { data, error } = await supabase
    .from('orders')
    .update({
      ...updates,
      order_date: updates.order_date,
      total_amount: updates.total_amount,
      confidence_score: updates.confidence_score,
    })
    .eq('id', orderId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return rowToOrder(data);
}

export async function deleteOrder(userId: string, orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
    .eq('user_id', userId);

  if (error) throw error;
}
