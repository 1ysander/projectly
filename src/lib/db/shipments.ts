import { supabase } from '../supabase';
import { Shipment } from '../../app/data/mock-data';

export interface ShipmentRow {
  id: string;
  user_id: string;
  carrier: string;
  tracking_number: string;
  linked_order_id?: string;
  item_name?: string;
  merchant_name?: string;
  status: string;
  last_scan: string;
  eta?: string;
  delivery_city?: string;
  delivery_state?: string;
  return_tracking_number?: string;
  return_to_city?: string;
  return_to_state?: string;
  tracking_events?: Array<{
    status: string;
    message: string;
    datetime?: string;
    city?: string;
    state?: string;
  }>;
  progress: number;
  created_at: string;
  updated_at: string;
}

function rowToShipment(row: ShipmentRow): Shipment {
  return {
    shipment_id: row.id,
    carrier: row.carrier,
    tracking_number: row.tracking_number,
    linked_order_id: row.linked_order_id,
    item_name: row.item_name,
    merchant_name: row.merchant_name,
    status: row.status,
    last_scan: row.last_scan,
    eta: row.eta,
    delivery_city: row.delivery_city,
    delivery_state: row.delivery_state,
    return_tracking_number: row.return_tracking_number,
    return_to_city: row.return_to_city,
    return_to_state: row.return_to_state,
    tracking_events: row.tracking_events,
    progress: row.progress,
  };
}

export async function getShipments(userId: string): Promise<Shipment[]> {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shipments:', error);
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    return (data || []).map(rowToShipment);
  } catch (error) {
    console.error('Unexpected error in getShipments:', error);
    return [];
  }
}

export async function getShipmentById(userId: string, shipmentId: string): Promise<Shipment | null> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('id', shipmentId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? rowToShipment(data) : null;
}

export async function createShipment(userId: string, shipment: Omit<Shipment, 'shipment_id'>): Promise<Shipment> {
  const { data, error } = await supabase
    .from('shipments')
    .insert({
      user_id: userId,
      carrier: shipment.carrier,
      tracking_number: shipment.tracking_number,
      linked_order_id: shipment.linked_order_id || null,
      item_name: shipment.item_name || null,
      merchant_name: shipment.merchant_name,
      status: shipment.status,
      last_scan: shipment.last_scan,
      eta: shipment.eta,
      delivery_city: shipment.delivery_city,
      delivery_state: shipment.delivery_state,
      return_tracking_number: shipment.return_tracking_number,
      return_to_city: shipment.return_to_city,
      return_to_state: shipment.return_to_state,
      tracking_events: shipment.tracking_events,
      progress: shipment.progress,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToShipment(data);
}

export async function updateShipment(
  userId: string,
  shipmentId: string,
  updates: Partial<Omit<Shipment, 'shipment_id'>>
): Promise<Shipment> {
  const { data, error } = await supabase
    .from('shipments')
    .update(updates)
    .eq('id', shipmentId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return rowToShipment(data);
}

export async function deleteShipment(userId: string, shipmentId: string): Promise<void> {
  const { error } = await supabase
    .from('shipments')
    .delete()
    .eq('id', shipmentId)
    .eq('user_id', userId);

  if (error) throw error;
}
