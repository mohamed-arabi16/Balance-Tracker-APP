import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SafeScreen } from '@/components/layout/SafeScreen';

export default function TransactionsScreen() {
  const { t } = useTranslation();
  return (
    <SafeScreen>
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-bold text-primary dark:text-white">
          {t('tabs.transactions')}
        </Text>
      </View>
    </SafeScreen>
  );
}
