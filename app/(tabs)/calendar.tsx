import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  addMonths,
  endOfMonth,
  format,
  getDay,
  parseISO,
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

  // Map of YYYY-MM-DD -> first card for that day
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
    <Screen scroll={false}>
      <Text style={styles.title}>Calendar</Text>
      <View style={styles.monthRow}>
        <Pressable onPress={() => setCursor((d) => subMonths(d, 1))} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{format(cursor, 'MMMM yyyy')}</Text>
        <Pressable onPress={() => setCursor((d) => addMonths(d, 1))} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
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
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
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
                style={[
                  styles.cell,
                  card ? styles.cellLogged : null,
                  isToday ? styles.cellToday : null,
                ]}
                onPress={() => card && setPicked(card)}
                disabled={!card}
              >
                <Text style={[styles.dayNum, card ? styles.dayNumLogged : null]}>
                  {format(d, 'd')}
                </Text>
                {card ? <Text style={styles.leaf}>🌿</Text> : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.legend}>Tap any green day to revisit that day's flashcard.</Text>

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

const CELL_GAP = 6;

const styles = StyleSheet.create({
  title: { fontSize: fontSizes.xxl, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { fontSize: 22, color: colors.text, fontWeight: '600' },
  monthLabel: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.text },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: spacing.sm,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CELL_GAP,
    justifyContent: 'space-between',
  },
  cell: {
    width: `${100 / 7 - 1.6}%`,
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLogged: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  cellToday: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  dayNum: { fontSize: fontSizes.sm, color: colors.text, fontWeight: '600' },
  dayNumLogged: { color: colors.primaryDark },
  leaf: { fontSize: 12, marginTop: 2 },
  legend: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
  closeText: { color: '#fff', fontWeight: '600' },
});
