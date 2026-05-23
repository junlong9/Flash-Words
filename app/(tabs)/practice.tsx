import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Flashcard } from '@/components/Flashcard';
import { useAuth } from '@/providers/AuthProvider';
import { fetchProfile, listFlashcards, submitReview } from '@/lib/db';
import {
  buildPracticeQueue,
  practiceStats,
  scheduleReview,
  RATING_HINTS,
  RATING_LABELS,
  type ReviewRating,
} from '@/lib/srs';
import { detectTimezone, todayInTimezone } from '@/lib/timezone';
import { colors, fontSizes, radii, spacing } from '@/theme/colors';

type Phase = 'idle' | 'active' | 'complete';

const RATINGS: ReviewRating[] = ['again', 'hard', 'good', 'easy'];

export default function PracticeScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQ = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchProfile(user!.id),
  });

  const cardsQ = useQuery({
    queryKey: ['flashcards', user?.id],
    enabled: !!user?.id,
    queryFn: () => listFlashcards(user!.id),
  });

  const tz = profileQ.data?.timezone ?? detectTimezone();
  const today = todayInTimezone(tz);
  const allCards = cardsQ.data ?? [];

  const stats = useMemo(() => practiceStats(allCards, today), [allCards, today]);

  const [phase, setPhase] = useState<Phase>('idle');
  const [queue, setQueue] = useState<typeof allCards>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const current = queue[index] ?? null;

  const reviewMutation = useMutation({
    mutationFn: ({ cardId, rating }: { cardId: string; rating: ReviewRating }) => {
      const card = allCards.find((c) => c.id === cardId);
      if (!card) throw new Error('Card not found.');
      const schedule = scheduleReview(card, rating, today);
      return submitReview(user!.id, cardId, schedule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards', user?.id] });
    },
  });

  const startSession = useCallback(() => {
    const nextQueue = buildPracticeQueue(allCards, today);
    setQueue(nextQueue);
    setIndex(0);
    setFlipped(false);
    setReviewed(0);
    setPhase(nextQueue.length > 0 ? 'active' : 'idle');
  }, [allCards, today]);

  const finishCard = useCallback(
    (rating: ReviewRating) => {
      if (!current || !user?.id) return;
      const reviewedCardId = current.id;
      const nextReviewed = reviewed + 1;

      reviewMutation.mutate(
        { cardId: reviewedCardId, rating },
        {
          onError: (err: any) => {
            const message =
              err?.message?.includes('schema cache') || err?.message?.includes('column')
                ? 'Run supabase/migrations/002_srs_review.sql in Supabase, then reload the app.'
                : err?.message ?? 'That rating did not save. Please try again later.';
            Alert.alert('Review not saved', message);
          },
        }
      );

      setReviewed(nextReviewed);
      setFlipped(false);

      if (index + 1 >= queue.length) {
        setPhase('complete');
        return;
      }
      setIndex((i) => i + 1);
    },
    [current, user?.id, reviewMutation, reviewed, index, queue.length]
  );

  const loading = cardsQ.isLoading || profileQ.isLoading;

  if (loading) {
    return (
      <Screen scroll={false} hasTabBar>
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      </Screen>
    );
  }

  if (allCards.length === 0) {
    return (
      <Screen hasTabBar>
        <View style={styles.header}>
          <Text style={styles.title}>Practice</Text>
          <Text style={styles.subtitle}>Spaced repetition review</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.empty}>Add words in Garden first, then come back to review.</Text>
        </View>
      </Screen>
    );
  }

  if (phase === 'complete') {
    return (
      <Screen hasTabBar>
        <View style={styles.header}>
          <Text style={styles.title}>Session complete</Text>
          <Text style={styles.subtitle}>
            You reviewed {reviewed} word{reviewed === 1 ? '' : 's'}.
          </Text>
        </View>
        <View style={styles.summaryBox}>
          <StatRow label="Due tomorrow" value={String(stats.due)} />
          <StatRow label="New remaining" value={String(stats.new)} />
        </View>
        <Button title="Done" onPress={() => setPhase('idle')} />
        {stats.sessionSize > 0 ? (
          <Button title="Practice again" variant="secondary" onPress={startSession} style={{ marginTop: spacing.sm }} />
        ) : null}
      </Screen>
    );
  }

  if (phase === 'active' && current) {
    const progress = `${index + 1} / ${queue.length}`;
    return (
      <Screen hasTabBar contentStyle={styles.sessionContent}>
        <View style={styles.sessionHeader}>
          <Text style={styles.progress}>{progress}</Text>
          <Pressable onPress={() => setPhase('idle')} hitSlop={8}>
            <Text style={styles.exit}>Exit</Text>
          </Pressable>
        </View>

        <View style={styles.cardArea}>
          <Flashcard
            card={current}
            flipped={flipped}
            onFlip={() => setFlipped((v) => !v)}
            showHint={!flipped}
          />
        </View>

        {!flipped ? (
          <Text style={styles.prompt}>Try to recall the meaning, then tap the card.</Text>
        ) : (
          <View style={styles.ratings}>
            <Text style={styles.ratePrompt}>How well did you know it?</Text>
            <View style={styles.ratingGrid}>
              {RATINGS.map((rating) => (
                <Pressable
                  key={rating}
                  onPress={() => finishCard(rating)}
                  style={({ pressed }) => [
                    styles.ratingBtn,
                    ratingStyles[rating],
                    pressed && styles.ratingPressed,
                  ]}
                >
                  <Text style={[styles.ratingLabel, ratingLabelStyles[rating]]}>
                    {RATING_LABELS[rating]}
                  </Text>
                  <Text style={styles.ratingHint}>{RATING_HINTS[rating]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen hasTabBar>
      <View style={styles.header}>
        <Text style={styles.title}>Practice</Text>
        <Text style={styles.subtitle}>Review due words first, then learn new ones</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatTile label="Due today" value={stats.due} highlight={stats.due > 0} />
        <StatTile label="Overdue" value={stats.overdue} highlight={stats.overdue > 0} />
        <StatTile label="New" value={stats.new} />
        <StatTile label="This session" value={stats.sessionSize} />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Each session mixes overdue reviews, words due today, and up to 5 new words - not your
          whole word bank at once.
        </Text>
      </View>

      {stats.sessionSize === 0 ? (
        <Text style={styles.allCaughtUp}>All caught up for today. Come back tomorrow.</Text>
      ) : (
        <Button title={`Start session (${stats.sessionSize})`} onPress={startSession} />
      )}
    </Screen>
  );
}

function StatTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.statTile, highlight && styles.statTileHighlight]}>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statRowLabel}>{label}</Text>
      <Text style={styles.statRowValue}>{value}</Text>
    </View>
  );
}

const ratingStyles: Record<ReviewRating, { backgroundColor: string; borderColor: string }> = {
  again: { backgroundColor: '#FDEEED', borderColor: '#E8B4B0' },
  hard: { backgroundColor: '#FDF6EC', borderColor: '#E8D4B0' },
  good: { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted },
  easy: { backgroundColor: '#EDF5EE', borderColor: '#B8D4BB' },
};

const ratingLabelStyles: Record<ReviewRating, { color: string }> = {
  again: { color: colors.danger },
  hard: { color: '#9A7B4F' },
  good: { color: colors.primaryDark },
  easy: { color: colors.primary },
};

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '500',
    color: colors.primaryDark,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statTile: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statTileHighlight: {
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primarySoft,
  },
  statValue: {
    fontSize: fontSizes.xxl,
    fontWeight: '500',
    color: colors.text,
  },
  statValueHighlight: { color: colors.primaryDark },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  infoText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  allCaughtUp: {
    textAlign: 'center',
    color: colors.primaryDark,
    fontSize: fontSizes.sm,
    marginBottom: spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sessionContent: {
    flexGrow: 1,
  },
  progress: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: '500',
  },
  exit: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  cardArea: {
    marginTop: spacing.sm,
  },
  prompt: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  ratings: {
    marginTop: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  ratePrompt: {
    textAlign: 'center',
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  ratingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ratingBtn: {
    width: '47%',
    flexGrow: 1,
    minHeight: 68,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  ratingPressed: { opacity: 0.7 },
  ratingDisabled: { opacity: 0.5 },
  ratingLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  ratingHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statRowLabel: { color: colors.textMuted, fontSize: fontSizes.sm },
  statRowValue: { color: colors.text, fontSize: fontSizes.sm, fontWeight: '500' },
});
