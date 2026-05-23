import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { PlantHydration, PlantStage } from '@/lib/types';
import { colors } from '@/theme/colors';

type Props = {
  stage: PlantStage;
  hydration: PlantHydration;
  size?: number;
};

/**
 * A simple, illustrative SVG plant whose visuals scale by stage and shift hue by hydration.
 */
export function Plant({ stage, hydration, size = 220 }: Props) {
  const palette = palettes[hydration];
  const droop = hydration === 'wilted' ? 'wilt' : hydration === 'thirsty' ? 'thirsty' : 'fresh';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="pot" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#C99166" />
            <Stop offset="1" stopColor="#8E5A37" />
          </LinearGradient>
          <LinearGradient id="leaf" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.leafLight} />
            <Stop offset="1" stopColor={palette.leafDark} />
          </LinearGradient>
        </Defs>

        {/* Pot */}
        <Path
          d="M55 150 L145 150 L138 188 Q100 196 62 188 Z"
          fill="url(#pot)"
        />
        <Rect x="50" y="142" width="100" height="12" rx="3" fill="#7A4A2C" />
        {/* Soil */}
        <Ellipse cx="100" cy="148" rx="48" ry="6" fill="#3F2A1B" />

        {renderStage(stage, droop)}
      </Svg>
    </View>
  );
}

function renderStage(stage: PlantStage, droop: 'fresh' | 'thirsty' | 'wilt') {
  switch (stage) {
    case 'seed':
      return (
        <>
          <Ellipse cx="100" cy="146" rx="6" ry="4" fill="#5C3A22" />
        </>
      );
    case 'seedling':
      return (
        <>
          <Path
            d={droop === 'wilt' ? 'M100 146 Q104 138 110 138' : 'M100 146 Q98 132 92 130'}
            stroke={leaf('leafDark', droop)}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
          <Ellipse cx={droop === 'wilt' ? 112 : 90} cy={droop === 'wilt' ? 138 : 128} rx="9" ry="5" fill="url(#leaf)" />
          <Ellipse cx="100" cy="146" rx="5" ry="3" fill="#5C3A22" />
        </>
      );
    case 'sprout':
      return (
        <>
          <Path d="M100 146 L100 110" stroke={leaf('leafDark', droop)} strokeWidth={3} strokeLinecap="round" />
          <Ellipse cx={droop === 'wilt' ? 90 : 86} cy={droop === 'wilt' ? 124 : 120} rx="14" ry="7" fill="url(#leaf)" transform={`rotate(${droop === 'wilt' ? 30 : -25} 86 120)`} />
          <Ellipse cx={droop === 'wilt' ? 110 : 114} cy={droop === 'wilt' ? 124 : 116} rx="14" ry="7" fill="url(#leaf)" transform={`rotate(${droop === 'wilt' ? -30 : 25} 114 116)`} />
          <Ellipse cx="100" cy="106" rx="9" ry="6" fill="url(#leaf)" />
        </>
      );
    case 'sapling':
      return (
        <>
          <Path d="M100 146 L100 90" stroke="#6B4324" strokeWidth={5} strokeLinecap="round" />
          <Path d="M100 118 Q80 110 72 100" stroke="#6B4324" strokeWidth={3} strokeLinecap="round" fill="none" />
          <Path d="M100 110 Q120 102 130 92" stroke="#6B4324" strokeWidth={3} strokeLinecap="round" fill="none" />
          <Circle cx="100" cy="84" r="22" fill="url(#leaf)" />
          <Circle cx="76" cy="96" r="13" fill="url(#leaf)" />
          <Circle cx="128" cy="88" r="14" fill="url(#leaf)" />
        </>
      );
    case 'young_tree':
      return (
        <>
          <Path d="M100 146 L100 76" stroke="#5E3818" strokeWidth={7} strokeLinecap="round" />
          <Path d="M100 110 Q72 100 60 84" stroke="#5E3818" strokeWidth={4} strokeLinecap="round" fill="none" />
          <Path d="M100 100 Q130 90 144 72" stroke="#5E3818" strokeWidth={4} strokeLinecap="round" fill="none" />
          <Circle cx="100" cy="68" r="30" fill="url(#leaf)" />
          <Circle cx="68" cy="80" r="18" fill="url(#leaf)" />
          <Circle cx="138" cy="68" r="18" fill="url(#leaf)" />
          <Circle cx="120" cy="50" r="14" fill="url(#leaf)" />
        </>
      );
    case 'mature_tree':
      return (
        <>
          <Path d="M100 146 L100 70" stroke="#4A2C12" strokeWidth={9} strokeLinecap="round" />
          <Path d="M100 110 Q66 96 52 76" stroke="#4A2C12" strokeWidth={5} strokeLinecap="round" fill="none" />
          <Path d="M100 100 Q138 86 154 64" stroke="#4A2C12" strokeWidth={5} strokeLinecap="round" fill="none" />
          <Circle cx="100" cy="58" r="36" fill="url(#leaf)" />
          <Circle cx="56" cy="72" r="22" fill="url(#leaf)" />
          <Circle cx="146" cy="60" r="22" fill="url(#leaf)" />
          <Circle cx="116" cy="36" r="18" fill="url(#leaf)" />
          <Circle cx="80" cy="40" r="14" fill="url(#leaf)" />
        </>
      );
  }
}

function leaf(_kind: string, droop: 'fresh' | 'thirsty' | 'wilt') {
  if (droop === 'wilt') return '#8B6E3F';
  if (droop === 'thirsty') return '#7C9E54';
  return '#5BA86F';
}

const palettes: Record<PlantHydration, { leafLight: string; leafDark: string }> = {
  watered: { leafLight: '#7CD9A0', leafDark: '#2E9968' },
  thirsty: { leafLight: '#C0D88A', leafDark: '#7C9E54' },
  wilted:  { leafLight: '#B49B66', leafDark: '#7A6539' },
};

export const STATUS_COLOR: Record<PlantHydration, string> = {
  watered: colors.watered,
  thirsty: colors.thirsty,
  wilted: colors.wilted,
};

export const STATUS_LABEL: Record<PlantHydration, string> = {
  watered: 'Watered',
  thirsty: 'Thirsty',
  wilted: 'Wilting',
};
