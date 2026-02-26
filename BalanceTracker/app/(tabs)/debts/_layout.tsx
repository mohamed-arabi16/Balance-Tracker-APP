import { Stack } from 'expo-router';

export default function DebtsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Debts', headerShown: true }} />
      <Stack.Screen
        name="add-debt"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.75, 1],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetCornerRadius: 16,
          title: 'Add Debt',
        }}
      />
      <Stack.Screen
        name="payment"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.5, 0.75],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetCornerRadius: 16,
          title: 'Make Payment',
        }}
      />
      <Stack.Screen name="[id]" options={{ title: 'Payment History' }} />
    </Stack>
  );
}
