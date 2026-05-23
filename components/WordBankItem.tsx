import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Flashcard } from '@/components/Flashcard';
import type { Flashcard as FlashcardModel } from '@/lib/types';
import { colors, fontSizes, spacing } from '@/theme/colors';

type Props = {
  card: FlashcardModel;
  onRemove: (card: FlashcardModel) => void;
  removing?: boolean;
};

export function WordBankItem({ card, onRemove, removing }: Props) {
  const confirmRemove = () => {
    Alert.alert(
      'Remove word?',
      `"${card.word}" will be deleted from your word bank. Your plant growth is kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemove(card) },
      ]
    );
  };

  return (
    <View style={styles.row}>
      <View style={styles.cardWrap}>
        <Flashcard card={card} />
      </View>
      <Pressable
        onPress={confirmRemove}
        disabled={removing}
        style={({ pressed }) => [styles.removeBtn, pressed && styles.removePressed]}
        accessibilityLabel={`Remove ${card.word}`}
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardWrap: { flex: 1 },
  removeBtn: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    opacity: 0.85,
  },
  removePressed: { opacity: 0.5 },
});
