import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Flashcard as FlashcardModel } from '@/lib/types';
import { colors, fontSizes, radii, spacing } from '@/theme/colors';
import { prettyDate } from '@/lib/timezone';

type Props = {
  card: FlashcardModel;
  flipped?: boolean;
  onFlip?: () => void;
  showHint?: boolean;
};

export function Flashcard({ card, flipped: controlledFlipped, onFlip, showHint = true }: Props) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const flipped = controlledFlipped ?? internalFlipped;

  const handlePress = () => {
    if (onFlip) onFlip();
    else setInternalFlipped((v) => !v);
  };

  return (
    <Pressable onPress={handlePress} style={styles.card}>
      {!flipped ? <Front card={card} /> : <Back card={card} />}
      {showHint ? (
        <Text style={styles.tapHint}>{flipped ? 'Tap for word' : 'Tap for definition'}</Text>
      ) : null}
    </Pressable>
  );
}

function Front({ card }: { card: FlashcardModel }) {
  return (
    <View style={styles.faceFront}>
      <Text style={styles.dateLabel}>{prettyDate(card.logged_date)}</Text>
      <Text style={styles.word}>{card.word}</Text>
      {card.phonetic ? <Text style={styles.phonetic}>{card.phonetic}</Text> : null}
      {card.part_of_speech ? (
        <View style={styles.posPill}>
          <Text style={styles.pos}>{card.part_of_speech}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Back({ card }: { card: FlashcardModel }) {
  const first = card.definitions[0];
  return (
    <View style={styles.faceBack}>
      <Text style={styles.smallWord}>{card.word}</Text>
      {card.definitions.map((d, i) => (
        <View key={i} style={{ marginTop: i === 0 ? spacing.xs : spacing.md }}>
          <Text style={styles.def}>{d.definition}</Text>
          {d.example ? <Text style={styles.example}>{d.example}</Text> : null}
          {d.synonyms && d.synonyms.length > 0 ? (
            <Text style={styles.synonyms}>{d.synonyms.join(', ')}</Text>
          ) : null}
        </View>
      ))}
      {!first ? <Text style={styles.example}>No definition stored.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.lg,
    minHeight: 160,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  faceFront: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  faceBack: {},
  dateLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  word: {
    fontSize: fontSizes.xxl,
    fontWeight: '400',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  phonetic: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing.xs },
  posPill: {
    marginTop: spacing.md,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  pos: {
    fontSize: fontSizes.xs,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  smallWord: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  def: { fontSize: fontSizes.md, color: colors.text, lineHeight: 22, fontWeight: '400' },
  example: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  synonyms: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: spacing.xs,
  },
  tapHint: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginTop: spacing.md,
    letterSpacing: 0.2,
  },
});
