import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type UserSettingsRow = Database["public"]["Tables"]["user_settings"]["Row"];
type UserSettingsUpdate = Database["public"]["Tables"]["user_settings"]["Update"];

const DEFAULT_USER_SETTINGS = {
  default_currency: "USD",
  auto_convert: true,
  theme: "system",
  include_long_term: true,
  auto_price_update: true,
  language: "en",
  net_worth_calculation: "assets_minus_debts",
  app_mode: "simple",
} satisfies Omit<UserSettingsRow, "user_id">;

export const fetchOrCreateUserSettings = async (
  userId: string,
): Promise<UserSettingsRow> => {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("user_settings")
    .insert([{ user_id: userId, ...DEFAULT_USER_SETTINGS }])
    .select("*")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return inserted;
};

export const updateUserSettings = async ({
  userId,
  updates,
}: {
  userId: string;
  updates: UserSettingsUpdate;
}): Promise<UserSettingsRow> => {
  const { data, error } = await supabase
    .from("user_settings")
    .update(updates)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data;
  }

  const { data: upserted, error: upsertError } = await supabase
    .from("user_settings")
    .upsert([{ user_id: userId, ...DEFAULT_USER_SETTINGS, ...updates }], {
      onConflict: "user_id",
    })
    .select("*")
    .single();

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  return upserted;
};

export const useUserSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["userSettings", user?.id] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchOrCreateUserSettings(user!.id),
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (updates: UserSettingsUpdate) => {
      if (!user) {
        throw new Error("Cannot update settings without an authenticated user.");
      }
      return updateUserSettings({ userId: user.id, updates });
    },
    onMutate: async (updates) => {
      if (!user) {
        return { previous: null as UserSettingsRow | null };
      }

      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<UserSettingsRow>(queryKey) ?? null;

      if (previous) {
        queryClient.setQueryData<UserSettingsRow>(queryKey, {
          ...previous,
          ...updates,
        });
      }

      return { previous };
    },
    onError: (_error, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(queryKey, updatedSettings);
    },
  });

  return {
    settings: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isUpdating: mutation.isPending,
    updateSettings: mutation.mutateAsync,
  };
};

export type UserSettings = UserSettingsRow;
export { DEFAULT_USER_SETTINGS };
