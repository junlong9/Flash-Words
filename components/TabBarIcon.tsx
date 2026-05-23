import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';

export type TabIconName = 'garden' | 'bank' | 'practice' | 'calendar' | 'profile';

const ICONS: Record<
  TabIconName,
  { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }
> = {
  garden: { outline: 'leaf-outline', filled: 'leaf' },
  bank: { outline: 'book-outline', filled: 'book' },
  practice: { outline: 'refresh-circle-outline', filled: 'refresh-circle' },
  calendar: { outline: 'calendar-outline', filled: 'calendar' },
  profile: { outline: 'person-outline', filled: 'person' },
};

type Props = {
  name: TabIconName;
  focused: boolean;
  size?: number;
};

export function TabBarIcon({ name, focused, size = 22 }: Props) {
  const icon = ICONS[name];
  return (
    <Ionicons
      name={focused ? icon.filled : icon.outline}
      size={size}
      color={focused ? colors.primary : colors.textMuted}
    />
  );
}
