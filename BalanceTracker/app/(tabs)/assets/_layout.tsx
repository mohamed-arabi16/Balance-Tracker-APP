import { Stack } from 'expo-router';

export default function AssetsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Assets', headerShown: true }} />
      <Stack.Screen
        name="add-asset"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.75, 1],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetCornerRadius: 16,
          title: 'Add Asset',
        }}
      />
    </Stack>
  );
}
