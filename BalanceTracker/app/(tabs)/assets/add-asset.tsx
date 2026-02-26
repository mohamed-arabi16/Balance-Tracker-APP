import { Picker } from '@react-native-picker/picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { FormScreen } from '@/components/layout/FormScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useAddAsset, useAssets, useUpdateAsset } from '@/hooks/useAssets';
import { haptics } from '@/lib/haptics';

const CURRENCIES = ['USD', 'TRY'] as const;
type AssetCurrency = (typeof CURRENCIES)[number];

export default function AddAssetScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  // Find the existing asset from cache when editing
  const { data: assets } = useAssets();
  const existingAsset = isEditMode ? assets?.find((a) => a.id === id) : undefined;

  // Form state
  const [type, setType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [currency, setCurrency] = useState<AssetCurrency>('USD');
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill form in edit mode once the existing asset is loaded
  useEffect(() => {
    if (existingAsset) {
      setType(existingAsset.type);
      setQuantity(String(existingAsset.quantity));
      setUnit(existingAsset.unit);
      setPricePerUnit(String(existingAsset.price_per_unit));
      setCurrency(existingAsset.currency as AssetCurrency);
      setAutoUpdate(existingAsset.auto_update);
    }
  }, [existingAsset]);

  const addAssetMutation = useAddAsset();
  const updateAssetMutation = useUpdateAsset();

  const isPending = addAssetMutation.isPending || updateAssetMutation.isPending;

  async function handleSubmit() {
    setErrorMessage(null);

    if (!type.trim()) {
      Alert.alert('Validation Error', 'Asset type is required.');
      return;
    }
    const parsedQuantity = parseFloat(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid quantity.');
      return;
    }
    if (!unit.trim()) {
      Alert.alert('Validation Error', 'Unit is required.');
      return;
    }
    const parsedPrice = parseFloat(pricePerUnit);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Validation Error', 'Please enter a valid price per unit.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be signed in to add an asset.');
      return;
    }

    try {
      if (isEditMode && id) {
        await updateAssetMutation.mutateAsync({
          id,
          type: type.trim(),
          quantity: parsedQuantity,
          unit: unit.trim(),
          price_per_unit: parsedPrice,
          currency,
          auto_update: autoUpdate,
        });
      } else {
        await addAssetMutation.mutateAsync({
          user_id: user.id,
          type: type.trim(),
          quantity: parsedQuantity,
          unit: unit.trim(),
          price_per_unit: parsedPrice,
          currency,
          auto_update: autoUpdate,
        });
      }
      haptics.onSave();
      router.back();
    } catch (error) {
      haptics.onError();
      const message =
        error instanceof Error ? error.message : 'Something went wrong.';
      setErrorMessage(message);
    }
  }

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

          {/* Asset Type */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label]}>Asset Type</Text>
            <TextInput
              style={[styles.input]}
              value={type}
              onChangeText={setType}
              placeholder="e.g., Bitcoin, Gold, USD"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Quantity */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label]}>Quantity</Text>
            <TextInput
              style={[styles.input]}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="e.g., 0.5, 2, 100"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>

          {/* Unit */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label]}>Unit</Text>
            <TextInput
              style={[styles.input]}
              value={unit}
              onChangeText={setUnit}
              placeholder="e.g., BTC, oz, shares"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>

          {/* Price Per Unit */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label]}>Price Per Unit</Text>
            <TextInput
              style={[styles.input]}
              value={pricePerUnit}
              onChangeText={setPricePerUnit}
              placeholder="e.g., 45000"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </View>

          {/* Currency */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label]}>Currency</Text>
            <View style={[styles.pickerWrapper]}>
              <Picker
                selectedValue={currency}
                onValueChange={(val) => setCurrency(val as AssetCurrency)}
                style={[styles.picker]}
              >
                {CURRENCIES.map((cur) => (
                  <Picker.Item key={cur} label={cur} value={cur} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Auto Update */}
          <View style={styles.fieldGroup}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={[styles.label]}>Auto Update Price</Text>
                <Text style={styles.switchNote}>
                  When on, price updates automatically from market data
                </Text>
              </View>
              <Switch
                value={autoUpdate}
                onValueChange={(val) => {
                  haptics.onToggle();
                  setAutoUpdate(val);
                }}
                trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                thumbColor="#ffffff"
                accessibilityRole="switch"
                accessibilityLabel="Auto update price toggle"
                accessibilityState={{ checked: autoUpdate }}
              />
            </View>
          </View>

          {/* Inline error */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Save Button */}
          <Pressable
            onPress={handleSubmit}
            style={[styles.saveButton, isPending && styles.saveButtonDisabled]}
            disabled={isPending}
            accessibilityRole="button"
            accessibilityLabel={isEditMode ? 'Save changes' : 'Add asset'}
          >
            <Text style={styles.saveButtonText}>
              {isPending ? 'Saving…' : isEditMode ? 'Save Changes' : 'Add Asset'}
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flex: 1,
    marginEnd: 12,
    gap: 2,
  },
  switchNote: {
    fontSize: 12,
    color: '#6b7280',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
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
