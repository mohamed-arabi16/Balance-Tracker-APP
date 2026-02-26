import { Stack } from 'expo-router';

export default function InvoicesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Invoices', headerShown: true }} />
      <Stack.Screen
        name="new"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.95, 1],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetCornerRadius: 16,
          title: 'New Invoice',
        }}
      />
      <Stack.Screen name="[id]/index" options={{ title: 'Invoice', headerShown: true }} />
      <Stack.Screen
        name="[id]/edit"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.95, 1],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetCornerRadius: 16,
          title: 'Edit Invoice',
        }}
      />
    </Stack>
  );
}
