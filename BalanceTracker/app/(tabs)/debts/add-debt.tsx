import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

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
            <Text style={[styles.label]}>Title</Text>
            <TextInput
              style={[styles.input]}
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
            <Text style={[styles.label]}>Creditor / Person</Text>
            <TextInput
              style={[styles.input]}
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
            <Text style={[styles.label]}>Amount</Text>
            <TextInput
              style={[styles.input]}
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
            <Text style={[styles.label]}>Currency</Text>
            <TouchableOpacity
              onPress={() => setCurrencyModalVisible(true)}
              style={styles.pickerButton}
              accessibilityRole="button"
              accessibilityLabel="Select currency"
            >
              <Text style={styles.pickerButtonText}>{currency}</Text>
            </TouchableOpacity>
            <Modal visible={currencyModalVisible} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <FlatList
                    data={CURRENCIES}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => { setCurrency(item as DebtCurrency); setCurrencyModalVisible(false); }}
                        style={[styles.modalItem, item === currency && styles.modalItemSelected]}
                      >
                        <Text style={[styles.modalItemText, item === currency && styles.modalItemTextSelected]}>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            </Modal>
          </View>

          {/* Type */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label]}>Type</Text>
            <View style={styles.toggleRow}>
              {DEBT_TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    styles.toggleButton,
                    type === t && styles.toggleButtonActive,
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
            <Text style={[styles.label]}>Status</Text>
            <View style={styles.toggleRow}>
              {DEBT_STATUSES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  style={[
                    styles.toggleButton,
                    status === s && styles.toggleButtonActive,
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
            <Text style={[styles.label]}>Due Date</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[styles.dateButton]}
              accessibilityRole="button"
              accessibilityLabel={`Due date: ${formattedDueDate}. Tap to change.`}
            >
              <Text style={[styles.dateButtonText]}>{formattedDueDate}</Text>
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
                <Text style={[styles.label]}>Direction</Text>
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
    color: '#000000',
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000000',
  },
  pickerButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerButtonText: {
    fontSize: 15,
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    maxHeight: '60%' as unknown as number,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  modalItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  modalItemText: {
    fontSize: 15,
    color: '#111827',
  },
  modalItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  // iOS segmented control style
  toggleRow: {
    backgroundColor: '#E8E8ED',
    borderRadius: 10,
    padding: 2,
    flexDirection: 'row',
    gap: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 15,
    color: '#000000',
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
    color: '#6B7280',
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
