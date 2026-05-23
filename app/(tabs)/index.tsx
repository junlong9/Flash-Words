import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Plant, STATUS_COLOR, STATUS_LABEL } from '@/components/Plant';
import { UpsellModal } from '@/components/UpsellModal';
import { useAuth } from '@/providers/AuthProvider';
import {
  applyDailyLogToProfile,
  countFlashcardsOnDate,
  createFlashcard,
  fetchProfile,
  getFeaturedWordForDate,
  setPremium,
} from '@/lib/db';
import { lookupWord, DictionaryNotFoundError } from '@/lib/dictionary';
import { detectTimezone, todayInTimezone } from '@/lib/timezone';
import { plantStateFor, PLANT_STAGE_LABELS } from '@/lib/plant';
import type { DefinitionEntry } from '@/lib/types';
import { colors, fontSizes, radii, spacing } from '@/theme/colors';

export default function GardenScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [word, setWord] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualDefinition, setManualDefinition] = useState('');
  const [pendingWord, setPendingWord] = useState<string | null>(null);
  const [upsellVisible, setUpsellVisible] = useState(false);

  const profileQ = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchProfile(user!.id),
  });
  const profile = profileQ.data;

  const tz = profile?.timezone ?? detectTimezone();
  const today = todayInTimezone(tz);

  const todayCountQ = useQuery({
    queryKey: ['todayCount', user?.id, today],
    enabled: !!user?.id,
    queryFn: () => countFlashcardsOnDate(user!.id, today),
  });

  const plant = useMemo(
    () =>
      plantStateFor({
        totalWords: profile?.total_words ?? 0,
        lastLoggedDate: profile?.last_logged_date ?? null,
        timezone: tz,
      }),
    [profile?.total_words, profile?.last_logged_date, tz]
  );

  const todayCount = todayCountQ.data ?? 0;
  const canLogToday = (profile?.is_premium ?? false) || todayCount === 0;

  async function handleSubmit(useFeatured = false) {
    if (!user || !profile) return;
    setError(null);

    let toLog = word.trim();
    let source: 'dictionary_api' | 'featured' = 'dictionary_api';

    if (useFeatured) {
      const feat = await getFeaturedWordForDate(today);
      if (!feat) {
        Alert.alert('No featured word available', 'Try again later.');
        return;
      }
      toLog = feat.word;
      source = 'featured';
    }

    if (!toLog) {
      setError('Type a word first.');
      return;
    }

    if (!canLogToday) {
      setUpsellVisible(true);
      return;
    }

    setSubmitting(true);
    try {
      const lookup = await lookupWord(toLog);
      await persistAndRefresh({
        word: lookup.word,
        phonetic: lookup.phonetic,
        partOfSpeech: lookup.partOfSpeech,
        definitions: lookup.definitions,
        source,
        isManual: false,
      });
      setWord('');
    } catch (err: any) {
      if (err instanceof DictionaryNotFoundError) {
        setPendingWord(err.word);
        setShowManual(true);
        setError(null);
      } else {
        setError(err?.message ?? 'Something went wrong.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManualSave() {
    if (!user || !pendingWord) return;
    if (!manualDefinition.trim()) {
      Alert.alert('Add a definition', 'Type your own definition to save the card.');
      return;
    }
    setSubmitting(true);
    try {
      await persistAndRefresh({
        word: pendingWord,
        phonetic: null,
        partOfSpeech: null,
        definitions: [{ definition: manualDefinition.trim() }],
        source: 'dictionary_api',
        isManual: true,
      });
      setShowManual(false);
      setManualDefinition('');
      setPendingWord(null);
      setWord('');
    } catch (err: any) {
      Alert.alert('Save failed', err?.message ?? 'Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function persistAndRefresh(args: {
    word: string;
    phonetic: string | null;
    partOfSpeech: string | null;
    definitions: DefinitionEntry[];
    source: 'dictionary_api' | 'featured';
    isManual: boolean;
  }) {
    if (!user) return;
    await createFlashcard({
      userId: user.id,
      word: args.word.toLowerCase(),
      phonetic: args.phonetic,
      partOfSpeech: args.partOfSpeech,
      definitions: args.definitions,
      source: args.source,
      isManual: args.isManual,
      loggedDate: today,
    });
    await applyDailyLogToProfile(user.id, today);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['profile', user.id] }),
      qc.invalidateQueries({ queryKey: ['todayCount', user.id, today] }),
      qc.invalidateQueries({ queryKey: ['flashcards', user.id] }),
    ]);
  }

  if (profileQ.isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hi {profile?.display_name ?? 'there'} 👋</Text>
            <Text style={styles.subGreeting}>Today is {today}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakNumber}>{profile?.current_streak ?? 0}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[plant.hydration] }]}>
            <Text style={styles.statusText}>{STATUS_LABEL[plant.hydration]}</Text>
          </View>
          <Plant stage={plant.stage} hydration={plant.hydration} size={240} />
          <Text style={styles.stageLabel}>{PLANT_STAGE_LABELS[plant.stage]}</Text>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(plant.progressToNext * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {plant.nextStageAt
              ? `${profile?.total_words ?? 0} / ${plant.nextStageAt} words to next stage`
              : 'Maximum stage reached!'}
          </Text>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputTitle}>What word did you learn today?</Text>
          <TextField
            value={word}
            onChangeText={setWord}
            placeholder="e.g. serendipity"
            autoCapitalize="none"
            autoCorrect={false}
            error={error}
          />
          <Button
            title={canLogToday ? 'Water my plant' : 'Daily limit — Upgrade'}
            onPress={() => handleSubmit(false)}
            loading={submitting}
          />
          <Button
            title="Don't have a word? Get today's featured word"
            variant="ghost"
            onPress={() => handleSubmit(true)}
            disabled={submitting}
          />
          {!canLogToday ? (
            <Text style={styles.dailyDone}>
              You've watered your plant today. Free tier is 1 card/day.
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showManual}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManual(false)}
      >
        <View style={styles.modalScrim}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>We couldn't find “{pendingWord}”</Text>
            <Text style={styles.modalBody}>
              Add your own definition to save it as a flashcard.
            </Text>
            <TextInput
              style={styles.manualInput}
              value={manualDefinition}
              onChangeText={setManualDefinition}
              placeholder="Type a definition..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Button title="Save card" onPress={handleManualSave} loading={submitting} />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => {
                setShowManual(false);
                setManualDefinition('');
                setPendingWord(null);
              }}
            />
          </View>
        </View>
      </Modal>

      <UpsellModal
        visible={upsellVisible}
        onClose={() => setUpsellVisible(false)}
        onUpgrade={async () => {
          if (!user) return;
          await setPremium(user.id, true);
          await qc.invalidateQueries({ queryKey: ['profile', user.id] });
          setUpsellVisible(false);
          Alert.alert('Premium unlocked (stub)', 'Premium flag toggled in DB. Wire up real IAP later.');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.text },
  subGreeting: { color: colors.textMuted, marginTop: 2 },
  streakBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  streakNumber: { fontSize: fontSizes.xl, fontWeight: '800', color: colors.primaryDark },
  streakLabel: { fontSize: 10, color: colors.primaryDark, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
  },
  statusText: { color: '#fff', fontWeight: '700', fontSize: fontSizes.xs, letterSpacing: 0.5 },
  stageLabel: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  progressBar: {
    height: 8,
    width: '100%',
    backgroundColor: colors.bgAlt,
    borderRadius: radii.pill,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  progressText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  inputTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  dailyDone: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    gap: spacing.md,
  },
  modalTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
  modalBody: { fontSize: fontSizes.sm, color: colors.textMuted },
  manualInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.bg,
    fontSize: fontSizes.md,
    textAlignVertical: 'top',
  },
});
