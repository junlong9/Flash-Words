import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useAuth } from '@/providers/AuthProvider';
import { fetchProfile, setPremium } from '@/lib/db';
import {
  scheduleDailyReminder,
  cancelDailyReminder,
  getNotificationStatus,
} from '@/lib/notifications';
import { colors, fontSizes, radii, spacing } from '@/theme/colors';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();

  const profileQ = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchProfile(user!.id),
  });
  const profile = profileQ.data;

  const [reminderOn, setReminderOn] = useState(false);
  const [reminderInfo, setReminderInfo] = useState('');

  useEffect(() => {
    getNotificationStatus().then((s) => {
      setReminderOn(s.scheduled);
      setReminderInfo(s.info);
    });
  }, []);

  async function togglePremium(value: boolean) {
    if (!user) return;
    await setPremium(user.id, value);
    await qc.invalidateQueries({ queryKey: ['profile', user.id] });
  }

  async function toggleReminder(value: boolean) {
    if (value) {
      const ok = await scheduleDailyReminder();
      if (!ok) {
        Alert.alert('Permission needed', 'Allow notifications in Settings to enable daily reminders.');
        return;
      }
      setReminderOn(true);
    } else {
      await cancelDailyReminder();
      setReminderOn(false);
    }
    const s = await getNotificationStatus();
    setReminderInfo(s.info);
  }

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.statRow}>
        <Stat label="Streak" value={profile?.current_streak ?? 0} />
        <Stat label="Best" value={profile?.longest_streak ?? 0} />
        <Stat label="Words" value={profile?.total_words ?? 0} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Membership</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Premium</Text>
            <Text style={styles.rowSub}>
              {profile?.is_premium
                ? 'Unlimited cards · Rare plants · No ads'
                : '1 card/day · Basic plants · Ad-supported'}
            </Text>
          </View>
          <Switch
            value={!!profile?.is_premium}
            onValueChange={togglePremium}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.note}>
          (Stub) The premium toggle just flips a flag in your profile for now. Real in-app
          purchases will be wired in later.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily reminder</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Evening reminder</Text>
            <Text style={styles.rowSub}>
              Pings you at 8:00 PM if you haven't watered your plant yet.
            </Text>
          </View>
          <Switch
            value={reminderOn}
            onValueChange={toggleReminder}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
        </View>
        {reminderInfo ? <Text style={styles.note}>{reminderInfo}</Text> : null}
      </View>

      <View style={{ marginTop: spacing.xl }}>
        <Button title="Sign out" variant="secondary" onPress={signOut} />
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.text },
  email: { color: colors.textMuted, marginTop: 2, marginBottom: spacing.lg },
  statRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.primaryDark },
  statLabel: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowTitle: { fontSize: fontSizes.md, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  note: { fontSize: fontSizes.xs, color: colors.textMuted, fontStyle: 'italic' },
});
