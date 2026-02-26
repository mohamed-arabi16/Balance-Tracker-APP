import { View, Text } from 'react-native';
import { SafeScreen } from '@/components/layout/SafeScreen';

export default function IndexScreen() {
  return (
    <SafeScreen>
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-bold text-primary">
          {'Balance Tracker'}
        </Text>
        <Text className="text-secondary mt-2">
          {'NativeWind is working!'}
        </Text>
      </View>
    </SafeScreen>
  );
}
