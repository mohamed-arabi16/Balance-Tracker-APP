import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { SafeScreen } from '@/components/layout/SafeScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Asset, useAssets, useDeleteAsset } from '@/hooks/useAssets';
import { AssetPriceSnapshot, AssetPrices, useAssetPrices } from '@/hooks/useAssetPrices';
import { haptics } from '@/lib/haptics';
import { COLORS } from '@/lib/tokens';
import { assetWarningBadgeClasses } from '@/lib/statusBadgeTheme';

// ------------------------------------------------------------------
// DeleteAction — plain function to match ReanimatedSwipeable signature
// ------------------------------------------------------------------
function DeleteAction(
  _prog: SharedValue<number>,
  _drag: SharedValue<number>,
  onDelete: () => void,
) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 0 }],
  }));

  return (
    <Reanimated.View style={[styles.deleteAction, animStyle]}>
      <Pressable
        onPress={onDelete}
        style={styles.deleteButton}
        accessibilityRole="button"
        accessibilityLabel="Delete asset"
      >
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </Reanimated.View>
  );
}

// ------------------------------------------------------------------
// AssetRow
// ------------------------------------------------------------------
interface AssetRowProps {
  asset: Asset;
  prices: AssetPrices;
  loading: boolean;
  snapshot: AssetPriceSnapshot | null;
  onDelete: (asset: Asset) => void;
  onPress: (asset: Asset) => void;
}

function AssetRow({ asset, prices, loading, snapshot, onDelete, onPress }: AssetRowProps) {
  const { formatCurrency } = useCurrency();
  const { colorScheme } = useColorScheme();
  const rowBg = colorScheme === 'dark' ? COLORS.cellBg.dark : COLORS.cellBg.light;
  const swipeableRef = useRef<any>(null);

  const livePrice = asset.auto_update
    ? prices?.[asset.type.toLowerCase() as keyof typeof prices]
    : null;
  const effectivePrice = livePrice ?? asset.price_per_unit;
  const totalValue = asset.quantity * effectivePrice;

  // Only show stale warning AFTER loading is done AND snapshot is not null
  // (Pitfall: avoid flashing stale warning on initial mount before data arrives)
  const showWarning =
    asset.auto_update && !loading && snapshot !== null && Boolean(snapshot?.warning);
  const showLoadingIndicator = asset.auto_update && loading;
  const warningClasses = assetWarningBadgeClasses.stale;

  function handleDelete() {
    haptics.onDelete();
    Alert.alert(
      'Delete Asset',
      `Are you sure you want to delete "${asset.type}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => swipeableRef.current?.close(),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(asset),
        },
      ],
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      renderRightActions={(prog, drag) => DeleteAction(prog, drag, handleDelete)}
    >
      <Pressable
        onPress={() => onPress(asset)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: rowBg },
          { opacity: pressed ? 0.7 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${asset.type} asset, ${asset.quantity} ${asset.unit}`}
      >
        <View style={styles.rowLeft}>
          <Text style={styles.assetType}>{asset.type}</Text>
          <Text style={styles.assetQuantity}>
            {asset.quantity} {asset.unit}
          </Text>
        </View>
        <View style={styles.rowRight}>
          {showLoadingIndicator ? (
            <ActivityIndicator size="small" color="#6b7280" />
          ) : (
            <View style={styles.valueRow}>
              <Text style={styles.assetValue}>
                {formatCurrency(totalValue, asset.currency)}
              </Text>
              {showWarning && (
                <View className={`ml-2 px-2 py-0.5 rounded-full ${warningClasses.container}`}>
                  <Text className={`text-[11px] font-semibold ${warningClasses.text}`} accessibilityLabel="Stale price warning">
                    Stale
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Pressable>
    </Swipeable>
  );
}

// ------------------------------------------------------------------
// AssetScreen
// ------------------------------------------------------------------
export default function AssetScreen() {
  const router = useRouter();

  // Fetch asset list
  const { data: assets, isRefetching, refetch } = useAssets();

  // Fetch prices ONCE at screen level — pass down to rows
  const { prices, loading, snapshot } = useAssetPrices();

  // Delete mutation
  const deleteAssetMutation = useDeleteAsset();

  function handleDelete(asset: Asset) {
    deleteAssetMutation.mutate(asset);
  }

  function handleRowPress(asset: Asset) {
    router.push(('/(tabs)/assets/add-asset?id=' + asset.id) as any);
  }

  function handleAddAsset() {
    router.push('/(tabs)/assets/add-asset' as any);
  }

  return (
    <SafeScreen edges={['bottom']} grouped>
      {/* Add button header bar */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={handleAddAsset}
          style={styles.addButton}
          accessibilityRole="button"
          accessibilityLabel="Add asset"
        >
          <Text style={styles.addButtonText}>+ Add Asset</Text>
        </Pressable>
      </View>

      <FlatList
        data={assets ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AssetRow
            asset={item}
            prices={prices}
            loading={loading}
            snapshot={snapshot}
            onDelete={handleDelete}
            onPress={handleRowPress}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <EmptyState
            symbolName="banknote"
            title="No assets yet"
            message="Start tracking your assets to see them here."
            ctaLabel="Add Asset"
            onCta={handleAddAsset}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={assets?.length === 0 ? styles.emptyContainer : styles.listContent}
      />
    </SafeScreen>
  );
}

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 44,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  assetType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  assetQuantity: {
    fontSize: 13,
    color: '#6b7280',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
    marginStart: 16,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
