import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Currency } from '@/contexts/CurrencyContext';
import { useLogActivity } from './useLogActivity';
import { trackEvent } from '@/lib/analytics';

// Type definitions
export interface IncomeAmountHistory {
  id: string;
  income_id: string;
  user_id: string;
  amount: number;
  note: string;
  logged_at: string;
}

export interface Income {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  currency: Currency;
  category: string;
  status: 'expected' | 'received';
  date: string;
  client_id: string | null;
  created_at?: string;
  income_amount_history: IncomeAmountHistory[];
}

// 1. Hook to fetch all incomes for the current user
const fetchIncomes = async (userId: string) => {
  const { data, error } = await supabase
    .from('incomes')
    .select('*, income_amount_history(*)')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return data as Income[];
};

export const useIncomes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['incomes', user?.id],
    queryFn: () => fetchIncomes(user!.id),
    enabled: !!user,
  });
};

// 2. Hook to add a new income
const addIncome = async (newIncome: Omit<Income, 'id' | 'created_at' | 'income_amount_history'>) => {
  // First, insert the main income record
  const { data: incomeData, error: insertError } = await supabase
    .from('incomes')
    .insert([newIncome])
    .select()
    .single();

  if (insertError) throw new Error(insertError.message);

  // Create the initial history entry regardless of status
  if (incomeData) {
    const { data: authData } = await supabase.auth.getUser();
    const { error: historyError } = await supabase.from('income_amount_history').insert({
      income_id: incomeData.id,
      user_id: authData.user?.id,
      amount: incomeData.amount,
      note: 'Initial Amount',
    });

    if (historyError) {
      console.error('Failed to create initial income history:', historyError.message);
    }
  }

  // Fetch the final merged view combining history
  const { data: finalData, error: fetchError } = await supabase
    .from('incomes')
    .select('*, income_amount_history(*)')
    .eq('id', incomeData.id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  return finalData as Income;
};


export const useAddIncome = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: addIncome,
    onSuccess: (newIncome) => {
      queryClient.invalidateQueries({ queryKey: ['incomes', user?.id] });
      logActivity({
        type: 'income',
        action: 'create',
        description: `Created income: ${newIncome.title}`,
      });
      trackEvent('income_created', {
        incomeId: newIncome.id,
        status: newIncome.status,
      });
    },
  });
};

// 3. Hook to update an existing income
interface UpdateIncomePayload {
  id: string;
  title: string;
  date: string;
  status: 'expected' | 'received';
  currency: 'USD' | 'TRY';
  category: string;
  amount: number;
  note?: string;
  payment_date?: string;
  client_id?: string | null;
}

const updateIncome = async (payload: UpdateIncomePayload) => {
  // Update basic fields and amount
  const { error: updateError } = await supabase
    .from('incomes')
    .update({
      title: payload.title,
      date: payload.date,
      status: payload.status,
      currency: payload.currency,
      category: payload.category,
      amount: payload.amount,
      client_id: payload.client_id ?? null,
    })
    .eq('id', payload.id);

  if (updateError) throw new Error(updateError.message);

  // Then, insert history if it's expected
  if (payload.status === 'expected') {
    const { data: authData } = await supabase.auth.getUser();
    const historyData: import('@/integrations/supabase/types').Database['public']['Tables']['income_amount_history']['Insert'] = {
      income_id: payload.id,
      user_id: authData.user?.id as string,
      amount: payload.amount,
      note: payload.note || 'Updated amount',
    };
    if (payload.payment_date) {
      historyData.logged_at = payload.payment_date;
    }
    const { error: historyError } = await supabase.from('income_amount_history').insert(historyData);
    if (historyError) throw new Error(historyError.message);
  }

  return payload;
};

export const useUpdateIncome = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: updateIncome,
    onSuccess: (updatedIncome) => {
      queryClient.invalidateQueries({ queryKey: ['incomes', user?.id] });
      logActivity({
        type: 'income',
        action: 'edit',
        description: `Updated income: ${updatedIncome.title}`,
      });
      trackEvent('income_updated', {
        incomeId: updatedIncome.id,
        status: updatedIncome.status,
      });
    },
  });
};

// 4. Hook to delete an income
const deleteIncome = async (income: Income) => {
  const { error } = await supabase
    .from('incomes')
    .delete()
    .eq('id', income.id);

  if (error) throw new Error(error.message);
  return income;
};

export const useDeleteIncome = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: deleteIncome,
    onSuccess: (deletedIncome) => {
      queryClient.invalidateQueries({ queryKey: ['incomes', user?.id] });
      logActivity({
        type: 'income',
        action: 'delete',
        description: `Deleted income: ${deletedIncome.title}`,
      });
      trackEvent('income_deleted', {
        incomeId: deletedIncome.id,
      });
    },
  });
};
