import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme/colors';

const ICON: Record<string, string> = {
  garden: '🌱',
  bank: '📚',
  cal: '🗓️',
  me: '👤',
};

function TabIcon({ name, focused }: { name: keyof typeof ICON; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{ICON[name]}</Text>
  );
}

export default function TabsLayout() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) router.replace('/(auth)/sign-in');
  }, [isLoading, session]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Garden',
          tabBarIcon: ({ focused }) => <TabIcon name="garden" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="wordbank"
        options={{
          title: 'Word Bank',
          tabBarIcon: ({ focused }) => <TabIcon name="bank" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused }) => <TabIcon name="cal" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="me" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
