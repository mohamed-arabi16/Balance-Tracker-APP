import { View, Text } from 'react-native';

export default function IndexScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg font-bold text-primary">
        {'Balance Tracker'}
      </Text>
      <Text className="text-secondary mt-2">
        {'NativeWind is working!'}
      </Text>
    </View>
  );
}
