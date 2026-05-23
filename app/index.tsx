import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fontSizes, spacing } from '@/theme/colors';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function Gate() {
  const { isLoading, session } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Setup needed</Text>
        <Text style={styles.body}>
          Add your Supabase credentials to a `.env` file at the project root, then restart Expo:
        </Text>
        <Text style={styles.code}>
          EXPO_PUBLIC_SUPABASE_URL={'\n'}EXPO_PUBLIC_SUPABASE_ANON_KEY=
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.text },
  body: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  code: {
    fontFamily: 'Courier',
    color: colors.text,
    marginTop: spacing.lg,
    fontSize: fontSizes.sm,
  },
});
