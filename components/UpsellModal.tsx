import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { colors, fontSizes, radii, spacing } from '@/theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
};

export function UpsellModal({ visible, onClose, onUpgrade }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <Text style={styles.title}>One word a day on Free</Text>
          <Text style={styles.body}>
            You've watered your plant today. Upgrade to Premium for unlimited flashcards,
            rare plant types, and an ad-free experience.
          </Text>
          <Button title="Upgrade to Premium" onPress={onUpgrade} />
          <Button title="Maybe later" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 420,
    gap: spacing.md,
  },
  title: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.text },
  body: { fontSize: fontSizes.md, color: colors.textMuted, lineHeight: 22 },
});
