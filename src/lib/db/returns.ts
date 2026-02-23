import { supabase } from '../supabase';
import { UnifiedReturn } from '../../app/data/mock-data';

export interface ReturnRow {
  id: string;
  user_id: string;
  related_order_id?: string;
  merchant_name: string;
  merchant_logo?: string;
  status: string;
  method: string;
  refund_amount?: number;
  refund_timeline_estimate?: string;
  deadline_ship?: string;
  deadline_return?: string;
  order_number: string;
  items: string[];
  created_at: string;
  updated_at: string;
}

function rowToReturn(row: ReturnRow): UnifiedReturn {
  return {
    return_id: row.id,
    related_order_id: row.related_order_id || '',
    merchant_name: row.merchant_name,
    merchant_logo: row.merchant_logo,
    status: row.status as UnifiedReturn['status'],
    method: row.method as UnifiedReturn['method'],
    refund_amount: row.refund_amount ? Number(row.refund_amount) : undefined,
    refund_timeline_estimate: row.refund_timeline_estimate,
    deadline_ship: row.deadline_ship,
    deadline_return: row.deadline_return,
    order_number: row.order_number,
    items: row.items || [],
  };
}

export async function getReturns(userId: string): Promise<UnifiedReturn[]> {
  try {
    const { data, error } = await supabase
      .from('returns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching returns:', error);
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    return (data || []).map(rowToReturn);
  } catch (error) {
    console.error('Unexpected error in getReturns:', error);
    return [];
  }
}

export async function getReturnById(userId: string, returnId: string): Promise<UnifiedReturn | null> {
  const { data, error } = await supabase
    .from('returns')
    .select('*')
    .eq('id', returnId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? rowToReturn(data) : null;
}

export async function createReturn(userId: string, returnItem: Omit<UnifiedReturn, 'return_id'>): Promise<UnifiedReturn> {
  const { data, error } = await supabase
    .from('returns')
    .insert({
      user_id: userId,
      related_order_id: returnItem.related_order_id || null,
      merchant_name: returnItem.merchant_name,
      merchant_logo: returnItem.merchant_logo,
      status: returnItem.status,
      method: returnItem.method,
      refund_amount: returnItem.refund_amount,
      refund_timeline_estimate: returnItem.refund_timeline_estimate,
      deadline_ship: returnItem.deadline_ship,
      deadline_return: returnItem.deadline_return,
      order_number: returnItem.order_number,
      items: returnItem.items,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToReturn(data);
}

export async function updateReturn(
  userId: string,
  returnId: string,
  updates: Partial<Omit<UnifiedReturn, 'return_id'>>
): Promise<UnifiedReturn> {
  const { data, error } = await supabase
    .from('returns')
    .update({
      ...updates,
      refund_amount: updates.refund_amount,
    })
    .eq('id', returnId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return rowToReturn(data);
}

export async function deleteReturn(userId: string, returnId: string): Promise<void> {
  const { error } = await supabase
    .from('returns')
    .delete()
    .eq('id', returnId)
    .eq('user_id', userId);

  if (error) throw error;
}
