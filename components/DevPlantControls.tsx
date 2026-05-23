import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import {
  GROWTH_XP_FIRST_DAILY,
  GROWTH_XP_REPEAT_DAILY,
  STAGE_XP_PRESETS,
} from '@/lib/plant';
import { colors, fontSizes, radii, spacing } from '@/theme/colors';

type Props = {
  currentXp: number;
  onFirstWater: () => void;
  onExtraWater: () => void;
  onUndoFirst: () => void;
  onUndoExtra: () => void;
  onNextStage: () => void;
  onPrevStage: () => void;
  onSetStage: (xp: number) => void;
  onReset: () => void;
};

export function DevPlantControls({
  currentXp,
  onFirstWater,
  onExtraWater,
  onUndoFirst,
  onUndoExtra,
  onNextStage,
  onPrevStage,
  onSetStage,
  onReset,
}: Props) {
  if (!__DEV__) return null;

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Dev growth lab</Text>
      <Text style={styles.hint}>
        XP: {currentXp.toFixed(2)} · tap a stage to jump · scroll for more
      </Text>

      <Text style={styles.sub}>Jump to stage</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {STAGE_XP_PRESETS.map((preset) => {
          const active = Math.abs(currentXp - preset.xp) < 0.01;
          return (
            <Pressable
              key={preset.stage}
              onPress={() => onSetStage(preset.xp)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {preset.label}
              </Text>
              <Text style={[styles.chipXp, active && styles.chipTextActive]}>
                {preset.xp} XP
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.row}>
        <View style={styles.col}>
          <Button title={`+${GROWTH_XP_FIRST_DAILY} daily`} variant="secondary" onPress={onFirstWater} />
          <Button title={`+${GROWTH_XP_REPEAT_DAILY} extra`} variant="secondary" onPress={onExtraWater} />
          <Button title="Next stage" variant="ghost" onPress={onNextStage} />
        </View>
        <View style={styles.col}>
          <Button title={`−${GROWTH_XP_FIRST_DAILY} daily`} variant="secondary" onPress={onUndoFirst} />
          <Button title={`−${GROWTH_XP_REPEAT_DAILY} extra`} variant="secondary" onPress={onUndoExtra} />
          <Button title="Prev stage" variant="ghost" onPress={onPrevStage} />
        </View>
      </View>

      <Button title="Reset to seed (0 XP)" variant="ghost" onPress={onReset} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primaryMuted,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  hint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  sub: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.xs,
  },
  chipRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minWidth: 72,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.textInverse,
  },
  chipXp: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  col: {
    flex: 1,
    gap: spacing.sm,
  },
});
