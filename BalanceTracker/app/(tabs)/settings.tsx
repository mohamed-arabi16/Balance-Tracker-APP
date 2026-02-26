import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SafeScreen } from '@/components/layout/SafeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { haptics } from '@/lib/haptics';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    haptics.onDelete();
    await signOut();
    // Stack.Protected in _layout.tsx handles redirect to (auth) automatically
  };

  return (
    <SafeScreen>
      <View className="flex-1 px-6 py-8">
        {/* Screen title */}
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          {t('tabs.more')}
        </Text>

        {/* Signed in as */}
        {user?.email ? (
          <View className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 mb-6">
            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('settings.signedInAs')}
            </Text>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">
              {user.email}
            </Text>
          </View>
        ) : null}

        {/* Sign out button */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-4 items-center"
          activeOpacity={0.7}
        >
          <Text className="text-red-600 dark:text-red-400 font-semibold text-base">
            {t('settings.signOut')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeScreen>
  );
}
