import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

export default function AuthLayout() {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace('/(tabs)');
  }, [session]);

  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
