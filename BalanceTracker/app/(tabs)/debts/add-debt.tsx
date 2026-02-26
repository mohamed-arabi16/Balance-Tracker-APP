import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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

  const dynamicStyles = {
    input: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderColor: isDark ? '#38383A' : '#D1D5DB',
      color: isDark ? '#FFFFFF' : '#111827',
    },
    pickerWrapper: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderColor: isDark ? '#38383A' : '#D1D5DB',
    },
    picker: {
      color: isDark ? '#FFFFFF' : '#111827',
    },
    dateButton: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      borderColor: isDark ? '#38383A' : '#D1D5DB',
    },
    dateButtonText: {
      color: isDark ? '#FFFFFF' : '#111827',
    },
    label: {
      color: isDark ? '#EBEBF5' : '#374151',
    },
    toggleButton: {
      backgroundColor: isDark ? '#2C2C2E' : '#F9FAFB',
      borderColor: isDark ? '#38383A' : '#D1D5DB',
    },
    toggleButtonActive: {
      backgroundColor: isDark ? '#0A84FF22' : '#DBEAFE',
      borderColor: isDark ? '#0A84FF' : '#3B82F6',
    },
  };

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
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingHorizontal: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={{ color: '#007AFF', fontSize: 17 }}>Cancel</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <FormScreen>
        <View style={styles.container}>

          {/* Title */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, dynamicStyles.label]}>Title</Text>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
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
            <Text style={[styles.label, dynamicStyles.label]}>Creditor / Person</Text>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
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
            <Text style={[styles.label, dynamicStyles.label]}>Amount</Text>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
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
            <Text style={[styles.label, dynamicStyles.label]}>Currency</Text>
            <View style={[styles.pickerWrapper, dynamicStyles.pickerWrapper]}>
              <Picker
                selectedValue={currency}
                onValueChange={(val) => setCurrency(val as DebtCurrency)}
                style={[styles.picker, dynamicStyles.picker]}
              >
                {CURRENCIES.map((cur) => (
                  <Picker.Item key={cur} label={cur} value={cur} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Type */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, dynamicStyles.label]}>Type</Text>
            <View style={styles.toggleRow}>
              {DEBT_TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    styles.toggleButton,
                    dynamicStyles.toggleButton,
                    type === t && styles.toggleButtonActive,
                    type === t && dynamicStyles.toggleButtonActive,
                  ]}
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
            <Text style={[styles.label, dynamicStyles.label]}>Status</Text>
            <View style={styles.toggleRow}>
              {DEBT_STATUSES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  style={[
                    styles.toggleButton,
                    dynamicStyles.toggleButton,
                    status === s && styles.toggleButtonActive,
                    status === s && dynamicStyles.toggleButtonActive,
                  ]}
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
            <Text style={[styles.label, dynamicStyles.label]}>Due Date</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[styles.dateButton, dynamicStyles.dateButton]}
              accessibilityRole="button"
              accessibilityLabel={`Due date: ${formattedDueDate}. Tap to change.`}
            >
              <Text style={[styles.dateButtonText, dynamicStyles.dateButtonText]}>{formattedDueDate}</Text>
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
                <Text style={[styles.label, dynamicStyles.label]}>Direction</Text>
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
    </>
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
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 44,
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
    alignItems: 'center',
  },
  toggleButtonActive: {
    // base active styles; color overridden by dynamicStyles.toggleButtonActive
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
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dateButtonText: {
    fontSize: 15,
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
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
