import { Stack } from 'expo-router';

export default function ClientsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Clients', headerShown: true }} />
      <Stack.Screen
        name="new"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.85, 1],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetCornerRadius: 16,
          title: 'New Client',
        }}
      />
      <Stack.Screen name="[id]/index" options={{ title: 'Client', headerShown: true }} />
      <Stack.Screen
        name="[id]/edit"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.85, 1],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetCornerRadius: 16,
          title: 'Edit Client',
        }}
      />
    </Stack>
  );
}
