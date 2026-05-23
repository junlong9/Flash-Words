import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Flashcard as FlashcardModel } from '@/lib/types';
import { colors, fontSizes, radii, spacing } from '@/theme/colors';
import { prettyDate } from '@/lib/timezone';

type Props = {
  card: FlashcardModel;
};

export function Flashcard({ card }: Props) {
  const [flipped, setFlipped] = useState(false);
  return (
    <Pressable onPress={() => setFlipped((v) => !v)} style={styles.card}>
      {!flipped ? <Front card={card} /> : <Back card={card} />}
      <Text style={styles.tapHint}>Tap to {flipped ? 'see word' : 'flip'}</Text>
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
          <Text style={styles.posPillText}>{card.part_of_speech}</Text>
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
          <Text style={styles.def}>{i + 1}. {d.definition}</Text>
          {d.example ? <Text style={styles.example}>“{d.example}”</Text> : null}
          {d.synonyms && d.synonyms.length > 0 ? (
            <Text style={styles.synonyms}>Syn: {d.synonyms.join(', ')}</Text>
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
    borderRadius: radii.lg,
    padding: spacing.xl,
    minHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  faceFront: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  faceBack: {},
  dateLabel: { color: colors.textMuted, fontSize: fontSizes.xs, marginBottom: spacing.sm },
  word: { fontSize: fontSizes.display, fontWeight: '700', color: colors.text, textAlign: 'center' },
  phonetic: { fontSize: fontSizes.md, color: colors.textMuted, marginTop: spacing.xs },
  posPill: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
  },
  posPillText: { color: colors.primaryDark, fontSize: fontSizes.xs, fontWeight: '600' },
  smallWord: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  def: { fontSize: fontSizes.md, color: colors.text, lineHeight: 22 },
  example: {
    fontStyle: 'italic',
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: fontSizes.sm,
  },
  synonyms: {
    color: colors.primaryDark,
    fontSize: fontSizes.xs,
    marginTop: spacing.xs,
  },
  tapHint: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
