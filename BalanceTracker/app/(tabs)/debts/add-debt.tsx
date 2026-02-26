import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { FormScreen } from '@/components/layout/FormScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useAddDebt, useDebts, useUpdateDebt } from '@/hooks/useDebts';
import { haptics } from '@/lib/haptics';

const CURRENCIES = ['USD', 'TRY'] as const;
type DebtCurrency = (typeof CURRENCIES)[number];

const DEBT_TYPES = ['short', 'long'] as const;
type DebtType = (typeof DEBT_TYPES)[number];

const DEBT_STATUSES = ['pending', 'paid'] as const;
type DebtStatus = (typeof DEBT_STATUSES)[number];

export default function AddDebtScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  // Fetch existing debts to get the one being edited
  const { data: debts } = useDebts();
  const existingDebt = isEditMode ? debts?.find((d) => d.id === id) : undefined;

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [creditor, setCreditor] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<DebtCurrency>('USD');
  const [type, setType] = useState<DebtType>('short');
  const [status, setStatus] = useState<DebtStatus>('pending');
  const [dueDateValue, setDueDateValue] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isReceivable, setIsReceivable] = useState(false);

  // Pre-fill in edit mode
  useEffect(() => {
    if (existingDebt) {
      setTitle(existingDebt.title);
      setCreditor(existingDebt.creditor);
      setAmount(String(existingDebt.amount));
      setCurrency(existingDebt.currency as DebtCurrency);
      setType(existingDebt.type as DebtType);
      setStatus(existingDebt.status as DebtStatus);
      setIsReceivable(existingDebt.is_receivable);
      if (existingDebt.due_date) {
        setDueDateValue(new Date(existingDebt.due_date));
      }
    }
  }, [existingDebt]);

  const addDebtMutation = useAddDebt();
  const updateDebtMutation = useUpdateDebt();

  const isPending = addDebtMutation.isPending || updateDebtMutation.isPending;

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Title is required.');
      return;
    }
    if (!creditor.trim()) {
      Alert.alert('Validation Error', 'Creditor is required.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be signed in.');
      return;
    }

    const dueDateString = dueDateValue.toISOString().split('T')[0];

    try {
      if (isEditMode && id) {
        await updateDebtMutation.mutateAsync({
          id,
          title: title.trim(),
          creditor: creditor.trim(),
          amount: parsedAmount,
          currency,
          type,
          due_date: dueDateString,
          is_receivable: isReceivable,
          status,
          note: 'Updated',
        });
      } else {
        await addDebtMutation.mutateAsync({
          user_id: user.id,
          title: title.trim(),
          creditor: creditor.trim(),
          amount: parsedAmount,
          currency,
          type,
          due_date: dueDateString,
          is_receivable: isReceivable,
          status,
        });
      }
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
      setDueDateValue(selectedDate);
    }
  }

  const formattedDueDate = dueDateValue.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <FormScreen>
      <View style={styles.container}>

        {/* Title */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Car loan"
            placeholderTextColor="#9ca3af"
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        {/* Creditor */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Creditor / Person</Text>
          <TextInput
            style={styles.input}
            value={creditor}
            onChangeText={setCreditor}
            placeholder="e.g. Bank or friend's name"
            placeholderTextColor="#9ca3af"
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        {/* Amount */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </View>

        {/* Currency */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Currency</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={currency}
              onValueChange={(val) => setCurrency(val as DebtCurrency)}
              style={styles.picker}
            >
              {CURRENCIES.map((cur) => (
                <Picker.Item key={cur} label={cur} value={cur} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.toggleRow}>
            {DEBT_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[styles.toggleButton, type === t && styles.toggleButtonActive]}
                accessibilityRole="radio"
                accessibilityState={{ checked: type === t }}
              >
                <Text style={[styles.toggleText, type === t && styles.toggleTextActive]}>
                  {t === 'short' ? 'Short-term' : 'Long-term'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Status */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.toggleRow}>
            {DEBT_STATUSES.map((s) => (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                style={[styles.toggleButton, status === s && styles.toggleButtonActive]}
                accessibilityRole="radio"
                accessibilityState={{ checked: status === s }}
              >
                <Text style={[styles.toggleText, status === s && styles.toggleTextActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Due Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Due Date</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            accessibilityRole="button"
            accessibilityLabel={`Due date: ${formattedDueDate}. Tap to change.`}
          >
            <Text style={styles.dateButtonText}>{formattedDueDate}</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={dueDateValue}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
            />
          )}
        </View>

        {/* Is Receivable */}
        <View style={styles.fieldGroup}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelGroup}>
              <Text style={styles.label}>Direction</Text>
              <Text style={styles.switchSubLabel}>
                {isReceivable ? 'Someone owes me' : 'I owe this debt'}
              </Text>
            </View>
            <Switch
              value={isReceivable}
              onValueChange={(val) => {
                haptics.onToggle();
                setIsReceivable(val);
              }}
              accessibilityLabel="Toggle debt direction"
            />
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleSubmit}
          style={[styles.saveButton, isPending && styles.saveButtonDisabled]}
          disabled={isPending}
          accessibilityRole="button"
          accessibilityLabel={isEditMode ? 'Save changes' : 'Add debt'}
        >
          <Text style={styles.saveButtonText}>
            {isPending ? 'Saving…' : isEditMode ? 'Save Changes' : 'Add Debt'}
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
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  picker: {
    height: 44,
    color: '#111827',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  toggleButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  toggleText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#1d4ed8',
    fontWeight: '600',
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchLabelGroup: {
    flex: 1,
    gap: 2,
  },
  switchSubLabel: {
    fontSize: 13,
    color: '#6b7280',
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
