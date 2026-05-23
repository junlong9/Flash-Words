import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { AnimatedPlant } from '@/components/AnimatedPlant';
import { Flashcard } from '@/components/Flashcard';
import { STATUS_COLOR, STATUS_LABEL } from '@/components/Plant';
import { UpsellModal } from '@/components/UpsellModal';
import { useAuth } from '@/providers/AuthProvider';
import {
  applyDailyLogToProfile,
  countFlashcardsOnDate,
  createFlashcard,
  fetchProfile,
  findFlashcardByWord,
  getFeaturedWordForDate,
  setPremium,
} from '@/lib/db';
import { lookupWord, suggestWord, DictionaryNotFoundError } from '@/lib/dictionary';
import { detectTimezone, todayInTimezone } from '@/lib/timezone';
import {
  GROWTH_XP_FIRST_DAILY,
  GROWTH_XP_REPEAT_DAILY,
  PLANT_STAGE_LABELS,
  plantStateFor,
} from '@/lib/plant';
import type { DefinitionEntry, Flashcard as FlashcardModel } from '@/lib/types';
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
  const [waterPulse, setWaterPulse] = useState(0);
  const [rewindPulse, setRewindPulse] = useState(0);
  const [lastXpDelta, setLastXpDelta] = useState<number | null>(null);
  const [lastSavedCard, setLastSavedCard] = useState<FlashcardModel | null>(null);
  const [savedModalVisible, setSavedModalVisible] = useState(false);
  const [suggestedWord, setSuggestedWord] = useState<string | null>(null);

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

  const growthXp = Number(profile?.plant_growth_xp ?? profile?.total_words ?? 0);

  const plant = useMemo(
    () =>
      plantStateFor({
        growthXp,
        lastLoggedDate: profile?.last_logged_date ?? null,
        timezone: tz,
      }),
    [growthXp, profile?.last_logged_date, tz]
  );

  const todayCount = todayCountQ.data ?? 0;
  const canLogToday = (profile?.is_premium ?? false) || todayCount === 0;

  async function handleSubmit(useFeatured = false) {
    if (!user || !profile) return;
    setError(null);
    setSuggestedWord(null);
    Keyboard.dismiss();

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
      const saved = await lookupAndSaveWord(toLog, source);
      if (saved) setWord('');
    } catch (err: any) {
      if (err instanceof DictionaryNotFoundError) {
        const suggestion = await suggestWord(err.word);
        if (suggestion) {
          setPendingWord(err.word);
          setSuggestedWord(suggestion);
          setError(null);
          return;
        }
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

  async function lookupAndSaveWord(
    toLog: string,
    source: 'dictionary_api' | 'featured'
  ): Promise<FlashcardModel | null> {
    const lookup = await lookupWord(toLog);
    return persistAndRefresh({
      word: lookup.word,
      phonetic: lookup.phonetic,
      partOfSpeech: lookup.partOfSpeech,
      definitions: lookup.definitions,
      source,
      isManual: false,
    });
  }

  async function handleUseSuggestion() {
    if (!suggestedWord) return;
    const wordToUse = suggestedWord;
    setSuggestedWord(null);
    setError(null);
    setSubmitting(true);
    try {
      const saved = await lookupAndSaveWord(wordToUse, 'dictionary_api');
      if (saved) {
        setWord('');
        setPendingWord(null);
      } else {
        setWord(wordToUse);
      }
    } catch (err: any) {
      Alert.alert('Save failed', err?.message ?? 'Try again.');
      setWord(wordToUse);
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
      const saved = await persistAndRefresh({
        word: pendingWord,
        phonetic: null,
        partOfSpeech: null,
        definitions: [{ definition: manualDefinition.trim() }],
        source: 'dictionary_api',
        isManual: true,
      });
      if (saved) {
        setShowManual(false);
        setManualDefinition('');
        setPendingWord(null);
        setWord('');
      }
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
  }): Promise<FlashcardModel | null> {
    if (!user) return null;
    const normalizedWord = args.word.trim().toLowerCase();
    const existing = await findFlashcardByWord(user.id, normalizedWord);
    if (existing) {
      Alert.alert('Already saved', `"${existing.word}" is already in your word bank.`);
      return null;
    }

    const cardsTodayBefore = todayCount;
    const createdCard = await createFlashcard({
      userId: user.id,
      word: normalizedWord,
      phonetic: args.phonetic,
      partOfSpeech: args.partOfSpeech,
      definitions: args.definitions,
      source: args.source,
      isManual: args.isManual,
      loggedDate: today,
    });
    setLastSavedCard(createdCard);
    setSavedModalVisible(true);
    const { xpGained } = await applyDailyLogToProfile(user.id, today, cardsTodayBefore);
    setLastXpDelta(xpGained);
    setWaterPulse((n) => n + 1);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['profile', user.id] }),
      qc.invalidateQueries({ queryKey: ['todayCount', user.id, today] }),
      qc.invalidateQueries({ queryKey: ['flashcards', user.id] }),
    ]);
    return createdCard;
  }

  if (profileQ.isLoading) {
    return (
      <Screen hasTabBar>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen hasTabBar contentStyle={styles.screenContent}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardWrap}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{profile?.display_name ?? 'Guest'}</Text>
            <Text style={styles.subGreeting}>{today}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakNumber}>{profile?.current_streak ?? 0}</Text>
            <Text style={styles.streakLabel}>streak</Text>
          </View>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputTitle}>What word did you learn today?</Text>
          <TextField
            value={word}
            onChangeText={(value) => {
              setWord(value);
              setSuggestedWord(null);
            }}
            placeholder=""
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => handleSubmit(false)}
            error={error}
          />
          {suggestedWord ? (
            <View style={styles.suggestionBox}>
              <Text style={styles.suggestionText}>
                Did you mean <Text style={styles.suggestionWord}>{suggestedWord}</Text>?
              </Text>
              <View style={styles.suggestionActions}>
                <Button
                  title="Use it"
                  onPress={handleUseSuggestion}
                  loading={submitting}
                  fullWidth={false}
                  style={styles.suggestionButton}
                />
                <Button
                  title="Add manually"
                  variant="secondary"
                  onPress={() => {
                    setSuggestedWord(null);
                    setShowManual(true);
                  }}
                  disabled={submitting}
                  fullWidth={false}
                  style={styles.suggestionButton}
                />
              </View>
            </View>
          ) : null}
          <Button
            title={canLogToday ? 'Add word' : 'Daily limit reached'}
            onPress={() => handleSubmit(false)}
            loading={submitting}
          />
          <Button
            title="Featured word"
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

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[plant.hydration] }]} />
            <Text style={[styles.statusText, { color: STATUS_COLOR[plant.hydration] }]}>
              {STATUS_LABEL[plant.hydration]}
            </Text>
          </View>

          <View style={styles.plantFrame}>
            <AnimatedPlant
              stage={plant.stage}
              hydration={plant.hydration}
              foliageScale={plant.foliageScale}
              waterPulse={waterPulse}
              rewindPulse={rewindPulse}
              size={240}
            />
          </View>
          <Text style={styles.stageLabel}>{PLANT_STAGE_LABELS[plant.stage]}</Text>
          {lastXpDelta !== null ? (
            <Text
              style={[
                styles.xpGain,
                lastXpDelta < 0 ? styles.xpLoss : null,
              ]}
            >
              {lastXpDelta >= 0 ? '+' : ''}
              {lastXpDelta.toFixed(2)} growth
            </Text>
          ) : null}

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
              ? `${plant.growthXp.toFixed(1)} / ${plant.nextStageAt} XP · next: ${plant.nextStageLabel ? PLANT_STAGE_LABELS[plant.nextStageLabel] : ''}`
              : `${plant.growthXp.toFixed(1)} XP · fully grown`}
          </Text>
          <Text style={styles.xpHint}>
            First word today: +{GROWTH_XP_FIRST_DAILY} XP · extra words: +{GROWTH_XP_REPEAT_DAILY} XP
          </Text>
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

      <Modal
        visible={savedModalVisible && !!lastSavedCard}
        transparent
        animationType="fade"
        onRequestClose={() => setSavedModalVisible(false)}
      >
        <View style={styles.modalScrim}>
          <View style={styles.savedModalSheet}>
            <Text style={styles.modalTitle}>Word added</Text>
            {lastSavedCard ? <Flashcard card={lastSavedCard} /> : null}
            <Button title="Done" onPress={() => setSavedModalVisible(false)} />
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
  screenContent: { flexGrow: 1 },
  keyboardWrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  greeting: {
    fontSize: fontSizes.xl,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subGreeting: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: fontSizes.sm,
  },
  streakBadge: {
    alignItems: 'flex-end',
  },
  streakNumber: {
    fontSize: fontSizes.xxl,
    fontWeight: '300',
    color: colors.primaryDark,
    letterSpacing: -0.5,
  },
  streakLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.xl,
  },
  plantFrame: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#F5F4F0',
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontWeight: '500',
    fontSize: fontSizes.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  stageLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.primaryDark,
    marginTop: spacing.sm,
    letterSpacing: 0.3,
  },
  progressBar: {
    height: 2,
    width: '100%',
    backgroundColor: colors.border,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  progressText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  xpGain: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  xpLoss: {
    color: colors.textMuted,
  },
  xpHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
    opacity: 0.85,
  },
  inputCard: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  suggestionBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primaryMuted,
    padding: spacing.md,
    gap: spacing.sm,
  },
  suggestionText: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  suggestionWord: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  suggestionButton: {
    flex: 1,
  },
  inputTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  dailyDone: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    gap: spacing.md,
  },
  savedModalSheet: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    gap: spacing.md,
  },
  modalTitle: { fontSize: fontSizes.lg, fontWeight: '500', color: colors.text },
  modalBody: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
  manualInput: {
    minHeight: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.bg,
    fontSize: fontSizes.md,
    textAlignVertical: 'top',
  },
});
