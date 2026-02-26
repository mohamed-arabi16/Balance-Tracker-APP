import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

import { FormScreen } from '@/components/layout/FormScreen';
import { useClient, useUpdateClient } from '@/hooks/useClients';
import { haptics } from '@/lib/haptics';

// ─── Schema ───────────────────────────────────────────────────────────────────
const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z
    .string()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

// ─── ClientEditScreen ─────────────────────────────────────────────────────────
export default function ClientEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: client, isLoading } = useClient(id);
  const updateClient = useUpdateClient();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
  });

  // Pre-fill form once client data loads
  useEffect(() => {
    if (client) {
      reset({
        name: client.name,
        email: client.email ?? '',
        phone: client.phone ?? '',
        address: client.address ?? '',
      });
    }
  }, [client, reset]);

  async function onSubmit(values: ClientFormValues) {
    try {
      await updateClient.mutateAsync({
        id,
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
      });
      haptics.onSave();
      router.back();
    } catch (error) {
      haptics.onError();
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Error', message);
    }
  }

  const isPending = isSubmitting || updateClient.isPending;

  if (isLoading) {
    return (
      <FormScreen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <View style={styles.container}>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Name</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.name ? styles.inputError : undefined]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="e.g. Acme Corp"
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
                returnKeyType="next"
                accessibilityLabel="Client name"
              />
            )}
          />
          {errors.name ? (
            <Text style={styles.errorText}>{errors.name.message}</Text>
          ) : null}
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email (optional)</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : undefined]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="e.g. client@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                accessibilityLabel="Client email"
              />
            )}
          />
          {errors.email ? (
            <Text style={styles.errorText}>{errors.email.message}</Text>
          ) : null}
        </View>

        {/* Phone */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Phone (optional)</Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="e.g. +1 555 000 0000"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                returnKeyType="next"
                accessibilityLabel="Client phone"
              />
            )}
          />
        </View>

        {/* Address */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Address (optional)</Text>
          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="e.g. 123 Main St, New York"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                returnKeyType="done"
                accessibilityLabel="Client address"
              />
            )}
          />
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleSubmit(onSubmit)}
          style={[styles.saveButton, isPending ? styles.saveButtonDisabled : undefined]}
          disabled={isPending}
          accessibilityRole="button"
          accessibilityLabel="Save changes"
        >
          <Text style={styles.saveButtonText}>
            {isPending ? 'Saving…' : 'Save Changes'}
          </Text>
        </Pressable>

      </View>
    </FormScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    padding: 20,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
