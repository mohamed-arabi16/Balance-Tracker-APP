import { Stack } from 'expo-router';

export default function TransactionsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Transactions', headerShown: true }} />
      <Stack.Screen
        name="add-income"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.75, 1],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetCornerRadius: 16,
          title: 'Add Income',
        }}
      />
      <Stack.Screen
        name="add-expense"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.75, 1],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetCornerRadius: 16,
          title: 'Add Expense',
        }}
      />
    </Stack>
  );
}
