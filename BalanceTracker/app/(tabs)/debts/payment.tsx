import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FormScreen } from '@/components/layout/FormScreen';
import { useDebts, useUpdateDebt } from '@/hooks/useDebts';
import { haptics } from '@/lib/haptics';

export default function PaymentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Find the debt from cache
  const { data: debts } = useDebts();
  const debt = debts?.find((d) => d.id === id);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Pre-fill payment amount with current debt amount
  useEffect(() => {
    if (debt) {
      setPaymentAmount(String(debt.amount));
    }
  }, [debt]);

  const updateDebtMutation = useUpdateDebt();

  async function handleSubmit() {
    if (!debt) {
      Alert.alert('Error', 'Debt not found.');
      return;
    }

    const parsedAmount = parseFloat(paymentAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid payment amount.');
      return;
    }

    const newStatus = parsedAmount >= debt.amount ? 'paid' : 'pending';

    try {
      await updateDebtMutation.mutateAsync({
        id: debt.id,
        title: debt.title,
        creditor: debt.creditor,
        amount: parsedAmount,
        currency: debt.currency,
        type: debt.type,
        due_date: debt.due_date,
        is_receivable: debt.is_receivable,
        status: newStatus,
        note: 'Payment',
        payment_date: paymentDate.toISOString(),
      });
      haptics.onSave();
      router.back();
    } catch (error) {
      haptics.onError();
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Error', message);
    }
  }

  function handleDateChange(_event: unknown, selectedDate?: Date) {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setPaymentDate(selectedDate);
    }
  }

  const formattedPaymentDate = paymentDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isPending = updateDebtMutation.isPending;

  return (
    <FormScreen>
      <View style={styles.container}>

        {/* Debt context header */}
        {debt && (
          <View style={styles.contextCard}>
            <Text style={styles.contextLabel}>Recording payment for</Text>
            <Text style={styles.contextTitle}>{debt.title}</Text>
            <Text style={styles.contextMeta}>
              {debt.creditor} · {debt.currency} {debt.amount.toLocaleString()} outstanding
            </Text>
          </View>
        )}

        {/* Payment Amount */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Payment Amount</Text>
          <TextInput
            style={styles.input}
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </View>

        {/* Payment Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Payment Date</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            accessibilityRole="button"
            accessibilityLabel={`Payment date: ${formattedPaymentDate}. Tap to change.`}
          >
            <Text style={styles.dateButtonText}>{formattedPaymentDate}</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={paymentDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* Record Payment Button */}
        <Pressable
          onPress={handleSubmit}
          style={[styles.saveButton, isPending && styles.saveButtonDisabled]}
          disabled={isPending}
          accessibilityRole="button"
          accessibilityLabel="Record payment"
        >
          <Text style={styles.saveButtonText}>
            {isPending ? 'Recording…' : 'Record Payment'}
          </Text>
        </Pressable>

      </View>
    </FormScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  contextCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 3,
  },
  contextLabel: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  contextTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0c4a6e',
  },
  contextMeta: {
    fontSize: 13,
    color: '#0369a1',
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
  dateButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#111827',
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
