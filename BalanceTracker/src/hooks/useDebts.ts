import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLogActivity } from './useLogActivity';
import { trackEvent } from '@/lib/analytics';

// Type definitions
export interface DebtAmountHistory {
  id: string;
  debt_id: string;
  user_id: string;
  amount: number;
  note: string;
  logged_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  title: string;
  creditor: string;
  amount: number;
  currency: 'USD' | 'TRY';
  due_date: string | null;
  status: 'pending' | 'paid';
  type: 'short' | 'long';
  is_receivable: boolean;
  created_at?: string;
  debt_amount_history: DebtAmountHistory[];
}

// 1. Hook to fetch all debts
const fetchDebts = async (userId: string) => {
  const { data, error } = await supabase
    .from('debts')
    .select('*, debt_amount_history(*)')
    .eq('user_id', userId)
    .order('due_date', { ascending: true });

  if (error) throw new Error(error.message);
  return data as Debt[];
};

export const useDebts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['debts', user?.id],
    queryFn: () => fetchDebts(user!.id),
    enabled: !!user,
  });
};

// 2. Hook to add a new debt
type NewDebt = Omit<Debt, 'id' | 'created_at' | 'debt_amount_history' | 'amount'> & { amount: number };

const addDebt = async (newDebt: NewDebt) => {
  const { data, error } = await supabase
    .from('debts')
    .insert([newDebt])
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Explicitly create an initial history entry
  if (data) {
    const { data: authData } = await supabase.auth.getUser();
    const { error: historyError } = await supabase.from('debt_amount_history').insert({
      debt_id: data.id,
      user_id: authData.user?.id ?? '',
      amount: data.amount,
      note: 'Initial Amount',
    });

    if (historyError) {
      console.error('Failed to create initial debt history:', historyError.message);
    }
  }

  // Refetch the debt including the freshly created history
  const { data: finalData, error: fetchError } = await supabase
    .from('debts')
    .select('*, debt_amount_history(*)')
    .eq('id', data.id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  return finalData as Debt;
};

export const useAddDebt = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: addDebt,
    onSuccess: (newDebt) => {
      queryClient.invalidateQueries({ queryKey: ['debts', user?.id] });
      logActivity({
        type: 'debt',
        action: 'create',
        description: `Created debt: ${newDebt.title}`,
      });
      trackEvent('debt_created', {
        debtId: newDebt.id,
        debtType: newDebt.type,
        status: newDebt.status,
      });
    },
  });
};

// 3. Hook to update an existing debt (uses RPC for amount changes)
interface UpdateDebtPayload {
  id: string;
  title: string;
  creditor: string;
  due_date: string | null;
  status: 'pending' | 'paid';
  currency: 'USD' | 'TRY';
  type: 'short' | 'long';
  amount: number;
  is_receivable: boolean;
  note?: string;
  payment_date?: string;
}

const updateDebt = async (payload: UpdateDebtPayload) => {
  // Update basic fields first
  const { error: updateError } = await supabase
    .from('debts')
    .update({
      title: payload.title,
      creditor: payload.creditor,
      due_date: payload.due_date,
      status: payload.status,
      currency: payload.currency,
      type: payload.type,
      amount: payload.amount,
      is_receivable: payload.is_receivable,
    })
    .eq('id', payload.id);

  if (updateError) throw new Error(updateError.message);

  // Then, insert into history directly
  const { data: authData } = await supabase.auth.getUser();
  const historyData: import('@/integrations/supabase/types').Database['public']['Tables']['debt_amount_history']['Insert'] = {
    debt_id: payload.id,
    user_id: authData.user?.id as string,
    amount: payload.amount,
    note: payload.note || 'Updated amount',
  };

  if (payload.payment_date) {
    historyData.logged_at = payload.payment_date;
  }

  const { error: historyError } = await supabase
    .from('debt_amount_history')
    .insert(historyData);

  if (historyError) throw new Error(historyError.message);
  return payload;
};

export const useUpdateDebt = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: updateDebt,
    onSuccess: (updatedDebt) => {
      queryClient.invalidateQueries({ queryKey: ['debts', user?.id] });
      const action = updatedDebt.note?.toLowerCase().includes('payment') ? 'payment' : 'edit';
      logActivity({
        type: 'debt',
        action: action,
        description: action === 'payment' ? `Made payment on: ${updatedDebt.title}` : `Updated debt: ${updatedDebt.title}`,
      });
      trackEvent(action === 'payment' ? 'debt_payment_recorded' : 'debt_updated', {
        debtId: updatedDebt.id,
        debtType: updatedDebt.type,
        status: updatedDebt.status,
      });
    },
  });
};

// 4. Hook to delete a debt
const deleteDebt = async (debt: Debt) => {
  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', debt.id);

  if (error) throw new Error(error.message);
  return debt;
};

export const useDeleteDebt = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: deleteDebt,
    onSuccess: (deletedDebt) => {
      queryClient.invalidateQueries({ queryKey: ['debts', user?.id] });
      logActivity({
        type: 'debt',
        action: 'delete',
        description: `Deleted debt: ${deletedDebt.title}`,
      });
      trackEvent('debt_deleted', {
        debtId: deletedDebt.id,
        debtType: deletedDebt.type,
      });
    },
  });
};
