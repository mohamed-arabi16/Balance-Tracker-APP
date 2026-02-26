import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SharedValue } from 'react-native-reanimated';

import { SafeScreen } from '@/components/layout/SafeScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { useClients, useDeleteClient } from '@/hooks/useClients';
import type { Client } from '@/hooks/useClients';
import { haptics } from '@/lib/haptics';

// ─── DeleteAction ─────────────────────────────────────────────────────────────
function DeleteAction(
  prog: SharedValue<number>,
  drag: SharedValue<number>,
  onDelete: () => void,
) {
  const styleAnimation = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 80 }],
  }));

  return (
    <Reanimated.View style={[styles.deleteContainer, styleAnimation]}>
      <Pressable
        onPress={() => {
          haptics.onDelete();
          onDelete();
        }}
        style={styles.deleteButton}
        accessibilityRole="button"
        accessibilityLabel="Delete client"
      >
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </Reanimated.View>
  );
}

// ─── ClientRow ────────────────────────────────────────────────────────────────
function ClientRow({ item, onDelete }: { item: Client; onDelete: () => void }) {
  const router = useRouter();
  const subtitle = item.email ?? item.phone ?? '';

  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={(prog, drag) => DeleteAction(prog, drag, onDelete)}
    >
      <Pressable
        onPress={() => router.push(`/(tabs)/clients/${item.id}` as any)}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={`View details for client ${item.name}`}
      >
        <Text style={styles.rowName} numberOfLines={1}>
          {item.name}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </Pressable>
    </Swipeable>
  );
}

// ─── ClientsScreen ────────────────────────────────────────────────────────────
export default function ClientsScreen() {
  const router = useRouter();
  const { data: clients, isLoading, isRefetching, refetch } = useClients();
  const deleteClientMutation = useDeleteClient();

  function handleDelete(item: Client) {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteClientMutation.mutate(item.id, {
              onError: () => haptics.onError(),
            });
          },
        },
      ],
    );
  }

  return (
    <SafeScreen edges={['bottom']}>
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ClientRow item={item} onDelete={() => handleDelete(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        contentContainerStyle={clients?.length === 0 ? styles.emptyContainer : undefined}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No Clients Yet"
              message="Add your first client to start linking transactions and creating invoices."
              ctaLabel="Add Client"
              onCta={() => router.push('/(tabs)/clients/new' as any)}
            />
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Clients</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/clients/new' as any)}
              style={styles.addButton}
              accessibilityRole="button"
              accessibilityLabel="Add new client"
            >
              <Text style={styles.addButtonText}>+ Add Client</Text>
            </Pressable>
          </View>
        }
      />
    </SafeScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  row: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
  },
  deleteContainer: {
    width: 80,
    height: '100%',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    width: 80,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
