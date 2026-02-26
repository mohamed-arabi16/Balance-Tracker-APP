import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

import { FormScreen } from '@/components/layout/FormScreen';
import { useAddInvoice } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { haptics } from '@/lib/haptics';
import { invoiceFormSchema, type InvoiceFormValues } from '@/lib/invoiceFormSchema';

// ─── ClientPickerModal ────────────────────────────────────────────────────────
interface ClientPickerModalProps {
  visible: boolean;
  clients: Array<{ id: string; name: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

function ClientPickerModal({
  visible,
  clients,
  selectedId,
  onSelect,
  onClose,
}: ClientPickerModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={pickerStyles.container}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>Select Client</Text>
          <Pressable onPress={onClose} style={pickerStyles.closeButton}>
            <Text style={pickerStyles.closeText}>Done</Text>
          </Pressable>
        </View>
        <FlatList
          data={clients}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <Pressable
              style={[
                pickerStyles.clientRow,
                item.id === selectedId ? pickerStyles.clientRowSelected : undefined,
              ]}
              onPress={() => {
                haptics.onToggle();
                onSelect(item.id);
                onClose();
              }}
            >
              <Text
                style={[
                  pickerStyles.clientName,
                  item.id === selectedId ? pickerStyles.clientNameSelected : undefined,
                ]}
              >
                {item.name}
              </Text>
              {item.id === selectedId ? (
                <Text style={pickerStyles.checkmark}>✓</Text>
              ) : null}
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={pickerStyles.separator} />}
        />
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeButton: { padding: 8 },
  closeText: { fontSize: 16, color: '#2563eb', fontWeight: '600' },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  clientRowSelected: { backgroundColor: '#eff6ff' },
  clientName: { flex: 1, fontSize: 16, color: '#111827' },
  clientNameSelected: { fontWeight: '600', color: '#2563eb' },
  checkmark: { fontSize: 16, color: '#2563eb', marginLeft: 8 },
  separator: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 20 },
});

// ─── InvoiceNewScreen ─────────────────────────────────────────────────────────
export default function InvoiceNewScreen() {
  const router = useRouter();
  const addInvoice = useAddInvoice();
  const { data: clients } = useClients();
  const [pickerVisible, setPickerVisible] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      client_id: '',
      issue_date: '',
      due_date: '',
      currency: 'USD',
      tax_rate: 0,
      notes: '',
      items: [{ description: '', quantity: 1, unit_price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const selectedClientId = watch('client_id');
  const selectedClientName =
    clients?.find((c) => c.id === selectedClientId)?.name ?? '';

  const onSubmit = async (values: InvoiceFormValues) => {
    // Redundant minimum item check (Pitfall 7 from research)
    if (values.items.length === 0) return;
    addInvoice.mutate(values, {
      onSuccess: () => {
        haptics.onSave();
        router.back();
      },
      onError: (e) => {
        haptics.onError();
        Alert.alert('Error', e.message);
      },
    });
  };

  const isPending = isSubmitting || addInvoice.isPending;

  return (
    <FormScreen>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Client Picker ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Client</Text>
          <Controller
            control={control}
            name="client_id"
            render={({ field: { onChange, value } }) => (
              <>
                <Pressable
                  onPress={() => setPickerVisible(true)}
                  style={[
                    styles.pickerButton,
                    errors.client_id ? styles.inputError : undefined,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Select client"
                >
                  <Text
                    style={[
                      styles.pickerButtonText,
                      !value ? styles.pickerPlaceholder : undefined,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedClientName || 'Select a client…'}
                  </Text>
                  <Text style={styles.pickerChevron}>›</Text>
                </Pressable>
                <ClientPickerModal
                  visible={pickerVisible}
                  clients={clients ?? []}
                  selectedId={value}
                  onSelect={(id) => onChange(id)}
                  onClose={() => setPickerVisible(false)}
                />
              </>
            )}
          />
          {errors.client_id ? (
            <Text style={styles.errorText}>{errors.client_id.message}</Text>
          ) : null}
        </View>

        {/* ── Issue Date ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Issue Date</Text>
          <Controller
            control={control}
            name="issue_date"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.issue_date ? styles.inputError : undefined]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                keyboardType="numbers-and-punctuation"
                returnKeyType="next"
                accessibilityLabel="Issue date"
              />
            )}
          />
          {errors.issue_date ? (
            <Text style={styles.errorText}>{errors.issue_date.message}</Text>
          ) : null}
        </View>

        {/* ── Due Date (optional) ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Due Date (Optional)</Text>
          <Controller
            control={control}
            name="due_date"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
                keyboardType="numbers-and-punctuation"
                returnKeyType="next"
                accessibilityLabel="Due date"
              />
            )}
          />
        </View>

        {/* ── Currency ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Currency</Text>
          <Controller
            control={control}
            name="currency"
            render={({ field: { onChange, value } }) => (
              <View style={styles.segmentRow}>
                {(['USD', 'TRY'] as const).map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => onChange(c)}
                    style={[
                      styles.segmentItem,
                      value === c ? styles.segmentItemActive : undefined,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: value === c }}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        value === c ? styles.segmentTextActive : undefined,
                      ]}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          />
        </View>

        {/* ── Tax Rate ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Tax Rate (%)</Text>
          <Controller
            control={control}
            name="tax_rate"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.tax_rate ? styles.inputError : undefined]}
                value={String(value)}
                onChangeText={(text) => onChange(parseFloat(text) || 0)}
                onBlur={onBlur}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                returnKeyType="next"
                accessibilityLabel="Tax rate percentage"
              />
            )}
          />
          {errors.tax_rate ? (
            <Text style={styles.errorText}>{errors.tax_rate.message}</Text>
          ) : null}
        </View>

        {/* ── Notes ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Add any additional notes or payment terms..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                returnKeyType="done"
                accessibilityLabel="Invoice notes"
              />
            )}
          />
        </View>

        {/* ── Line Items ── */}
        <View style={styles.lineItemsSection}>
          <Text style={styles.sectionTitle}>Line Items</Text>

          {fields.map((field, index) => (
            <View key={field.id} style={styles.lineItemCard}>
              {/* Description */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Description</Text>
                <Controller
                  control={control}
                  name={`items.${index}.description`}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.input,
                        errors.items?.[index]?.description ? styles.inputError : undefined,
                      ]}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="e.g. Web development — homepage"
                      placeholderTextColor="#9ca3af"
                      returnKeyType="next"
                      accessibilityLabel={`Line item ${index + 1} description`}
                    />
                  )}
                />
                {errors.items?.[index]?.description ? (
                  <Text style={styles.errorText}>
                    {errors.items[index]?.description?.message}
                  </Text>
                ) : null}
              </View>

              {/* Quantity + Unit Price row */}
              <View style={styles.lineItemRow}>
                <View style={[styles.fieldGroup, styles.flex1]}>
                  <Text style={styles.label}>Qty</Text>
                  <Controller
                    control={control}
                    name={`items.${index}.quantity`}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[
                          styles.input,
                          errors.items?.[index]?.quantity ? styles.inputError : undefined,
                        ]}
                        value={String(value)}
                        onChangeText={(text) => onChange(parseFloat(text) || 0)}
                        onBlur={onBlur}
                        placeholder="1"
                        placeholderTextColor="#9ca3af"
                        keyboardType="decimal-pad"
                        returnKeyType="next"
                        accessibilityLabel={`Line item ${index + 1} quantity`}
                      />
                    )}
                  />
                  {errors.items?.[index]?.quantity ? (
                    <Text style={styles.errorText}>
                      {errors.items[index]?.quantity?.message}
                    </Text>
                  ) : null}
                </View>

                <View style={[styles.fieldGroup, styles.flex2]}>
                  <Text style={styles.label}>Rate</Text>
                  <Controller
                    control={control}
                    name={`items.${index}.unit_price`}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[
                          styles.input,
                          errors.items?.[index]?.unit_price ? styles.inputError : undefined,
                        ]}
                        value={String(value)}
                        onChangeText={(text) => onChange(parseFloat(text) || 0)}
                        onBlur={onBlur}
                        placeholder="0.00"
                        placeholderTextColor="#9ca3af"
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        accessibilityLabel={`Line item ${index + 1} unit price`}
                      />
                    )}
                  />
                  {errors.items?.[index]?.unit_price ? (
                    <Text style={styles.errorText}>
                      {errors.items[index]?.unit_price?.message}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Remove button */}
              <Pressable
                onPress={() => remove(index)}
                disabled={fields.length <= 1}
                style={[
                  styles.removeButton,
                  fields.length <= 1 ? styles.removeButtonDisabled : undefined,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Remove line item ${index + 1}`}
              >
                <Text
                  style={[
                    styles.removeButtonText,
                    fields.length <= 1 ? styles.removeButtonTextDisabled : undefined,
                  ]}
                >
                  Remove
                </Text>
              </Pressable>
            </View>
          ))}

          {/* errors on the items array itself (e.g. min 1) */}
          {errors.items && !Array.isArray(errors.items) ? (
            <Text style={styles.errorText}>
              {(errors.items as { message?: string }).message}
            </Text>
          ) : null}

          {/* Add Line Item */}
          <Pressable
            onPress={() => append({ description: '', quantity: 1, unit_price: 0 })}
            style={styles.addItemButton}
            accessibilityRole="button"
            accessibilityLabel="Add line item"
          >
            <Text style={styles.addItemButtonText}>+ Add Line Item</Text>
          </Pressable>
        </View>

        {/* ── Save Button ── */}
        <Pressable
          onPress={handleSubmit(onSubmit)}
          style={[styles.saveButton, isPending ? styles.saveButtonDisabled : undefined]}
          disabled={isPending}
          accessibilityRole="button"
          accessibilityLabel="Save invoice"
        >
          <Text style={styles.saveButtonText}>
            {isPending ? 'Saving…' : 'Save Invoice'}
          </Text>
        </Pressable>
      </ScrollView>
    </FormScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
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
  pickerButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontSize: 15,
    color: '#111827',
    flex: 1,
  },
  pickerPlaceholder: {
    color: '#9ca3af',
  },
  pickerChevron: {
    fontSize: 18,
    color: '#9ca3af',
    marginLeft: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  segmentItemActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  segmentTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  lineItemsSection: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  lineItemCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    backgroundColor: '#fafafa',
  },
  lineItemRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  removeButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  removeButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b91c1c',
  },
  removeButtonTextDisabled: {
    color: '#9ca3af',
  },
  addItemButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#eff6ff',
  },
  addItemButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
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
