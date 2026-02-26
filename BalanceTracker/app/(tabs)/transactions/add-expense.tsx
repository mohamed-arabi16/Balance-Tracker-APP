import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FormScreen } from '@/components/layout/FormScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useClients } from '@/hooks/useClients';
import { useAddExpense, useExpenses, useUpdateExpense } from '@/hooks/useExpenses';
import { haptics } from '@/lib/haptics';

const CATEGORIES = ['housing', 'utilities', 'transportation', 'groceries', 'healthcare', 'other'] as const;
type ExpenseCategory = typeof CATEGORIES[number];

const CURRENCIES = ['USD', 'TRY'] as const;
type ExpenseCurrency = typeof CURRENCIES[number];

const TYPES = ['fixed', 'variable'] as const;
type ExpenseType = typeof TYPES[number];

const STATUSES = ['pending', 'paid'] as const;
type ExpenseStatus = typeof STATUSES[number];

export default function AddExpenseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { isAdvanced } = useMode();
  const { data: clients = [] } = useClients();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  // Fetch existing expenses to get the one we're editing
  const { data: expenses } = useExpenses();
  const existingExpense = isEditMode
    ? expenses?.find((exp) => exp.id === id)
    : undefined;

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<ExpenseCurrency>('USD');
  const [category, setCategory] = useState<ExpenseCategory>('housing');
  const [type, setType] = useState<ExpenseType>('fixed');
  const [status, setStatus] = useState<ExpenseStatus>('pending');
  const [dateValue, setDateValue] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientModalVisible, setClientModalVisible] = useState(false);

  // Pre-fill form in edit mode once existing expense is loaded
  useEffect(() => {
    if (existingExpense) {
      setTitle(existingExpense.title);
      setAmount(String(existingExpense.amount));
      setCurrency(existingExpense.currency as ExpenseCurrency);
      setCategory(existingExpense.category as ExpenseCategory);
      setType(existingExpense.type as ExpenseType);
      setStatus(existingExpense.status as ExpenseStatus);
      setDateValue(new Date(existingExpense.date));
      setSelectedClientId(existingExpense.client_id ?? null);
    }
  }, [existingExpense]);

  const addExpenseMutation = useAddExpense();
  const updateExpenseMutation = useUpdateExpense();

  const isPending = addExpenseMutation.isPending || updateExpenseMutation.isPending;

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Title is required.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be signed in to add an expense.');
      return;
    }

    const isoDate = dateValue.toISOString().split('T')[0];

    try {
      if (isEditMode && id) {
        await updateExpenseMutation.mutateAsync({
          id,
          title: title.trim(),
          amount: parsedAmount,
          currency,
          category,
          type,
          status,
          date: isoDate,
          client_id: isAdvanced ? selectedClientId : null,
        });
      } else {
        await addExpenseMutation.mutateAsync({
          user_id: user.id,
          title: title.trim(),
          amount: parsedAmount,
          currency,
          category,
          type,
          status,
          date: isoDate,
          client_id: isAdvanced ? selectedClientId : null,
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
      setDateValue(selectedDate);
    }
  }

  const formattedDate = dateValue.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <FormScreen>
      <View style={styles.container}>

        {/* Title */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('expenses.form.title')}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('expenses.form.placeholder.title')}
            placeholderTextColor="#9ca3af"
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        {/* Amount */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('expenses.form.amount')}</Text>
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
          <Text style={styles.label}>{t('expenses.form.currency')}</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={currency}
              onValueChange={(val) => setCurrency(val as ExpenseCurrency)}
              style={styles.picker}
            >
              {CURRENCIES.map((cur) => (
                <Picker.Item key={cur} label={cur} value={cur} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('expenses.form.category')}</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={category}
              onValueChange={(val) => setCategory(val as ExpenseCategory)}
              style={styles.picker}
            >
              {CATEGORIES.map((cat) => (
                <Picker.Item
                  key={cat}
                  label={t(`expenses.form.category.${cat}`)}
                  value={cat}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Type (fixed / variable) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('expenses.form.type')}</Text>
          <View style={styles.toggleRow}>
            {TYPES.map((tp) => (
              <Pressable
                key={tp}
                onPress={() => setType(tp)}
                style={[
                  styles.toggleButton,
                  type === tp && styles.toggleButtonActive,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: type === tp }}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    type === tp && styles.toggleButtonTextActive,
                  ]}
                >
                  {t(`expenses.form.type.${tp}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Status (pending / paid) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('expenses.form.status')}</Text>
          <View style={styles.toggleRow}>
            {STATUSES.map((s) => (
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
                <Text
                  style={[
                    styles.toggleButtonText,
                    status === s && styles.toggleButtonTextActive,
                  ]}
                >
                  {t(`expenses.form.status.${s}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Client Picker — visible only in Advanced mode */}
        {isAdvanced && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('transactions.form.client', 'Client (Optional)')}</Text>
            <TouchableOpacity
              onPress={() => setClientModalVisible(true)}
              style={styles.clientButton}
              accessibilityRole="button"
              accessibilityLabel="Select client"
            >
              <Text style={styles.clientButtonText}>
                {selectedClientId
                  ? (clients.find((c) => c.id === selectedClientId)?.name ?? 'Select Client')
                  : t('transactions.form.noClient', 'No Client')}
              </Text>
            </TouchableOpacity>
            <Modal visible={clientModalVisible} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <FlatList
                    data={[{ id: null as string | null, name: t('transactions.form.noClient', 'No Client') }, ...clients]}
                    keyExtractor={(item) => item.id ?? 'none'}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedClientId(item.id);
                          setClientModalVisible(false);
                        }}
                        style={[
                          styles.modalItem,
                          item.id === selectedClientId && styles.modalItemSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.modalItemText,
                            item.id === selectedClientId && styles.modalItemTextSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            </Modal>
          </View>
        )}

        {/* Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('expenses.form.date')}</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            accessibilityRole="button"
            accessibilityLabel={`Date: ${formattedDate}. Tap to change.`}
          >
            <Text style={styles.dateButtonText}>{formattedDate}</Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={dateValue}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              maximumDate={new Date(2100, 11, 31)}
            />
          )}
        </View>

        {/* Save button */}
        <Pressable
          onPress={handleSubmit}
          style={[styles.saveButton, isPending && styles.saveButtonDisabled]}
          disabled={isPending}
          accessibilityRole="button"
          accessibilityLabel={isEditMode ? 'Save changes' : 'Add expense'}
        >
          <Text style={styles.saveButtonText}>
            {isPending ? 'Saving…' : isEditMode ? 'Save Changes' : 'Add Expense'}
          </Text>
        </Pressable>

      </View>
    </FormScreen>
  );
}

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
  toggleButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
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
  saveButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#fca5a5',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  clientButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  clientButtonText: {
    fontSize: 15,
    color: '#111827',
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
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemSelected: {
    backgroundColor: '#fef2f2',
  },
  modalItemText: {
    fontSize: 15,
    color: '#111827',
  },
  modalItemTextSelected: {
    color: '#ef4444',
    fontWeight: '600',
  },
});
