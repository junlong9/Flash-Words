import React from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, TAB_BAR_HEIGHT } from '@/theme/colors';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  /** Add space above the bottom tab bar (tab screens). */
  hasTabBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ children, scroll = true, hasTabBar = false, contentStyle }: Props) {
  const insets = useSafeAreaInsets();
  const bottomPad =
    spacing.lg + insets.bottom + (hasTabBar ? TAB_BAR_HEIGHT + spacing.sm : 0);

  if (scroll) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: bottomPad },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <View
      style={[
        styles.root,
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: bottomPad },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: spacing.lg,
  },
});
