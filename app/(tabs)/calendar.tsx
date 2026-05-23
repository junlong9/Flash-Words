import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import {
  addMonths,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { Screen } from '@/components/Screen';
import { Flashcard } from '@/components/Flashcard';
import { useAuth } from '@/providers/AuthProvider';
import { listFlashcards } from '@/lib/db';
import type { Flashcard as FlashcardModel } from '@/lib/types';
import { colors, fontSizes, radii, spacing } from '@/theme/colors';
import { todayInTimezone } from '@/lib/timezone';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CalendarScreen() {
  const { user } = useAuth();
  const [cursor, setCursor] = useState(new Date());
  const [picked, setPicked] = useState<FlashcardModel | null>(null);

  const cardsQ = useQuery({
    queryKey: ['flashcards', user?.id],
    enabled: !!user?.id,
    queryFn: () => listFlashcards(user!.id),
  });

  const byDate = useMemo(() => {
    const map = new Map<string, FlashcardModel>();
    for (const c of cardsQ.data ?? []) {
      if (!map.has(c.logged_date)) map.set(c.logged_date, c);
    }
    return map;
  }, [cardsQ.data]);

  const days = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const today = todayInTimezone();

  return (
    <Screen scroll={false} hasTabBar>
      <Text style={styles.title}>Calendar</Text>
      <View style={styles.monthRow}>
        <Pressable
          onPress={() => setCursor((d) => subMonths(d, 1))}
          style={styles.navBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.monthLabel}>{format(cursor, 'MMMM yyyy')}</Text>
        <Pressable
          onPress={() => setCursor((d) => addMonths(d, 1))}
          style={styles.navBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.weekHeader}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekHeaderText}>
            {w}
          </Text>
        ))}
      </View>

      {cardsQ.isLoading ? (
        <ActivityIndicator color={colors.text} style={{ marginTop: spacing.xxl }} />
      ) : (
        <View style={styles.grid}>
          {days.map((d, i) => {
            if (!d) return <View key={i} style={styles.cell} />;
            const dateStr = format(d, 'yyyy-MM-dd');
            const card = byDate.get(dateStr);
            const isToday = dateStr === today;
            return (
              <Pressable
                key={i}
                style={[styles.cell, isToday && styles.cellToday]}
                onPress={() => card && setPicked(card)}
                disabled={!card}
              >
                <Text style={[styles.dayNum, !card && styles.dayNumMuted]}>
                  {format(d, 'd')}
                </Text>
                {card ? <View style={styles.loggedDot} /> : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.legend}>Tap a marked day to review that word.</Text>

      <Modal visible={!!picked} transparent animationType="fade" onRequestClose={() => setPicked(null)}>
        <Pressable style={styles.scrim} onPress={() => setPicked(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {picked ? <Flashcard card={picked} /> : null}
            <Pressable onPress={() => setPicked(null)} style={styles.closeBtn}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function buildMonthGrid(date: Date): (Date | null)[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const startWeekday = getDay(start);
  const daysInMonth = end.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(date.getFullYear(), date.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const CELL_GAP = 4;

const styles = StyleSheet.create({
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '500',
    color: colors.primaryDark,
    marginBottom: spacing.lg,
    letterSpacing: -0.3,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: 0.2,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CELL_GAP,
    justifyContent: 'space-between',
  },
  cell: {
    width: `${100 / 7 - 1.2}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellToday: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
  },
  dayNum: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: '400',
  },
  dayNumMuted: {
    color: colors.textMuted,
  },
  loggedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  legend: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: spacing.lg,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: { width: '100%', maxWidth: 400, gap: spacing.md },
  closeBtn: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  closeText: { color: '#fff', fontWeight: '500', fontSize: fontSizes.sm },
});
