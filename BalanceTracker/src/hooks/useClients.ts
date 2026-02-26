import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import type { Database } from '@/integrations/supabase/types';

// Type definitions
export type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];

// 1. Hook to fetch all clients for the current user, ordered by name ascending
const fetchClients = async (userId: string): Promise<Client[]> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data as Client[];
};

export const useClients = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.clients(user!.id),
    queryFn: () => fetchClients(user!.id),
    enabled: !!user,
  });
};

// 2. Hook to fetch a single client by ID
const fetchClientById = async (clientId: string, userId: string): Promise<Client> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Client not found');
    }
    throw new Error(error.message);
  }
  return data as Client;
};

export const useClient = (clientId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...queryKeys.clients(user!.id), clientId],
    queryFn: () => fetchClientById(clientId, user!.id),
    enabled: !!user && !!clientId,
  });
};

// 3. Hook to add a new client
type ClientPayload = Omit<ClientInsert, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export const useAddClient = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: ClientPayload): Promise<Client> => {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...payload, user_id: user!.id }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(user!.id) });
    },
  });
};

// 4. Hook to update an existing client
export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updatePayload }: { id: string } & ClientUpdate): Promise<Client> => {
      const { data, error } = await supabase
        .from('clients')
        .update({ ...updatePayload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(user!.id) });
    },
  });
};

// 5. Hook to delete a client
export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (clientId: string): Promise<void> => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('user_id', user!.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(user!.id) });
    },
  });
};
