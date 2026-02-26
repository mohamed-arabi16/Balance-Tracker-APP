import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FormScreen } from '@/components/layout/FormScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useClients } from '@/hooks/useClients';
import { useAddIncome, useIncomes, useUpdateIncome } from '@/hooks/useIncomes';
import { haptics } from '@/lib/haptics';

const CATEGORIES = ['freelance', 'commission', 'rent', 'debt', 'other'] as const;
type IncomeCategory = typeof CATEGORIES[number];

const CURRENCIES = ['USD', 'TRY'] as const;
type IncomeCurrency = typeof CURRENCIES[number];

const STATUSES = ['expected', 'received'] as const;
type IncomeStatus = typeof STATUSES[number];

export default function AddIncomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { isAdvanced } = useMode();
  const { data: clients = [] } = useClients();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  // Fetch existing incomes to get the one we're editing
  const { data: incomes } = useIncomes();
  const existingIncome = isEditMode
    ? incomes?.find((inc) => inc.id === id)
    : undefined;

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<IncomeCurrency>('USD');
  const [category, setCategory] = useState<IncomeCategory>('freelance');
  const [status, setStatus] = useState<IncomeStatus>('expected');
  const [dateValue, setDateValue] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // Pre-fill form in edit mode once existing income is loaded
  useEffect(() => {
    if (existingIncome) {
      setTitle(existingIncome.title);
      setAmount(String(existingIncome.amount));
      setCurrency(existingIncome.currency as IncomeCurrency);
      setCategory(existingIncome.category as IncomeCategory);
      setStatus(existingIncome.status);
      setDateValue(new Date(existingIncome.date));
      setSelectedClientId(existingIncome.client_id ?? null);
    }
  }, [existingIncome]);

  const addIncomeMutation = useAddIncome();
  const updateIncomeMutation = useUpdateIncome();

  const isPending = addIncomeMutation.isPending || updateIncomeMutation.isPending;

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
      Alert.alert('Error', 'You must be signed in to add income.');
      return;
    }

    const isoDate = dateValue.toISOString().split('T')[0];

    try {
      if (isEditMode && id) {
        await updateIncomeMutation.mutateAsync({
          id,
          title: title.trim(),
          amount: parsedAmount,
          currency,
          category,
          status,
          date: isoDate,
          client_id: isAdvanced ? selectedClientId : null,
        });
      } else {
        await addIncomeMutation.mutateAsync({
          user_id: user.id,
          title: title.trim(),
          amount: parsedAmount,
          currency,
          category,
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
            <Text style={[styles.label, styles.label]}>{t('income.form.title')}</Text>
            <TextInput
              style={[styles.input]}
              value={title}
              onChangeText={setTitle}
              placeholder={t('income.form.placeholder.title')}
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Amount */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, styles.label]}>{t('income.form.amount')}</Text>
            <TextInput
              style={[styles.input]}
              value={amount}
              onChangeText={setAmount}
              placeholder={t('income.form.placeholder.amount')}
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </View>

          {/* Currency */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label]}>{t('income.form.currency')}</Text>
            <TouchableOpacity
              onPress={() => setCurrencyModalVisible(true)}
              style={styles.clientButton}
              accessibilityRole="button"
              accessibilityLabel="Select currency"
            >
              <Text style={styles.clientButtonText}>{currency}</Text>
            </TouchableOpacity>
            <Modal visible={currencyModalVisible} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <FlatList
                    data={CURRENCIES}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => { setCurrency(item as IncomeCurrency); setCurrencyModalVisible(false); }}
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

          {/* Category */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label]}>{t('income.form.category')}</Text>
            <TouchableOpacity
              onPress={() => setCategoryModalVisible(true)}
              style={styles.clientButton}
              accessibilityRole="button"
              accessibilityLabel="Select category"
            >
              <Text style={styles.clientButtonText}>{t(`income.form.category.${category}`)}</Text>
            </TouchableOpacity>
            <Modal visible={categoryModalVisible} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <FlatList
                    data={CATEGORIES}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => { setCategory(item as IncomeCategory); setCategoryModalVisible(false); }}
                        style={[styles.modalItem, item === category && styles.modalItemSelected]}
                      >
                        <Text style={[styles.modalItemText, item === category && styles.modalItemTextSelected]}>{t(`income.form.category.${item}`)}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            </Modal>
          </View>

          {/* Status */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, styles.label]}>{t('income.form.status')}</Text>
            <View style={styles.statusRow}>
              {STATUSES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  style={[
                    styles.statusButton,
                    status === s && styles.statusButtonActive,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: status === s }}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      status === s && styles.statusButtonTextActive,
                    ]}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Client Picker — visible only in Advanced mode */}
          {isAdvanced && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, styles.label]}>{t('transactions.form.client', 'Client (Optional)')}</Text>
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
            <Text style={[styles.label, styles.label]}>{t('income.form.date')}</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[styles.dateButton]}
              accessibilityRole="button"
              accessibilityLabel={`Date: ${formattedDate}. Tap to change.`}
            >
              <Text style={[styles.dateButtonText]}>{formattedDate}</Text>
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
            accessibilityLabel={isEditMode ? 'Save changes' : 'Add income'}
          >
            <Text style={styles.saveButtonText}>
              {isPending ? 'Saving…' : isEditMode ? 'Save Changes' : 'Add Income'}
            </Text>
          </Pressable>

        </View>
      </FormScreen>
    </>
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
  pickerWrapper: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 44,
  },
  // iOS segmented control style
  statusRow: {
    backgroundColor: '#E8E8ED',
    borderRadius: 10,
    padding: 2,
    flexDirection: 'row',
    gap: 2,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statusButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  statusButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusButtonTextActive: {
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
  clientButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  clientButtonText: {
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
});
