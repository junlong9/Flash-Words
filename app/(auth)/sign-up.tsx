import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fontSizes, spacing } from '@/theme/colors';

export default function SignUpScreen() {
  const { signUp, signIn } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email.trim(), password, displayName.trim() || undefined);
      // Try sign-in immediately. With email confirmation enabled this will
      // throw a clear error and we display it.
      try {
        await signIn(email.trim(), password);
      } catch {
        Alert.alert(
          'Almost there',
          'Check your email to confirm your account, then come back and sign in.'
        );
      }
    } catch (err: any) {
      setError(err?.message ?? 'Sign-up failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.hero}>
          <Text style={styles.brand}>Plant your first word</Text>
          <Text style={styles.tagline}>It only takes a moment.</Text>
        </View>

        <TextField
          label="Display name (optional)"
          autoCapitalize="words"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Alex"
        />
        <TextField
          label="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@domain.com"
        />
        <TextField
          label="Password"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Create account" onPress={onSubmit} loading={submitting} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/(auth)/sign-in" style={styles.link}>
            Sign in
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.xxl, marginTop: spacing.xl },
  brand: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.primaryDark,
    textAlign: 'center',
  },
  tagline: { fontSize: fontSizes.md, color: colors.textMuted, marginTop: spacing.sm },
  error: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  footerText: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '600' },
});
