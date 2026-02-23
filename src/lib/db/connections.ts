import { supabase } from '../supabase';
import { Connection } from '../../app/data/mock-data';

export interface ConnectionRow {
  id: string;
  user_id: string;
  name: string;
  type: string;
  logo: string;
  status: string;
  last_sync?: string;
  data_scope?: string;
  created_at: string;
  updated_at: string;
}

function rowToConnection(row: ConnectionRow): Connection {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Connection['type'],
    logo: row.logo,
    status: row.status as Connection['status'],
    last_sync: row.last_sync,
    data_scope: row.data_scope,
  };
}

export async function getConnections(userId: string): Promise<Connection[]> {
  try {
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching connections:', error);
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    return (data || []).map(rowToConnection);
  } catch (error) {
    console.error('Unexpected error in getConnections:', error);
    return [];
  }
}

export async function getConnectionById(userId: string, connectionId: string): Promise<Connection | null> {
  const { data, error } = await supabase
    .from('connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? rowToConnection(data) : null;
}

export async function createConnection(userId: string, connection: Omit<Connection, 'id'>): Promise<Connection> {
  const { data, error } = await supabase
    .from('connections')
    .insert({
      user_id: userId,
      name: connection.name,
      type: connection.type,
      logo: connection.logo,
      status: connection.status,
      last_sync: connection.last_sync,
      data_scope: connection.data_scope,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToConnection(data);
}

export async function updateConnection(
  userId: string,
  connectionId: string,
  updates: Partial<Omit<Connection, 'id'>>
): Promise<Connection> {
  const { data, error } = await supabase
    .from('connections')
    .update(updates)
    .eq('id', connectionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return rowToConnection(data);
}

export async function deleteConnection(userId: string, connectionId: string): Promise<void> {
  const { error } = await supabase
    .from('connections')
    .delete()
    .eq('id', connectionId)
    .eq('user_id', userId);

  if (error) throw error;
}
