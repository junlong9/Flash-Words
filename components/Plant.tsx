import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import type { PlantHydration, PlantStage } from '@/lib/types';
import { colors } from '@/theme/colors';

export type PlantProps = {
  stage: PlantStage;
  hydration: PlantHydration;
  size?: number;
  foliageScale?: number;
};

/** Soft flat palette for a familiar potted houseplant. */
type PlantPalette = {
  pot: string;
  potRim: string;
  soil: string;
  leaf: string;
  leafDark: string;
  stem: string;
};

const ANCHOR_X = 110;
const ANCHOR_Y = 126;

export function Plant({ stage, hydration, size = 240, foliageScale = 1 }: PlantProps) {
  const palette = useMemo(() => getPlantPalette(hydration), [hydration]);

  return (
    <View
      style={{
        width: size,
        height: size * 0.92,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F4F0',
        borderRadius: 12,
      }}
    >
      <Svg width={size} height={size * 0.92} viewBox="0 0 220 200">
        <PlantPot palette={palette} />

        <G
          transform={`translate(${ANCHOR_X}, ${ANCHOR_Y}) scale(${foliageScale}) translate(${-ANCHOR_X}, ${-ANCHOR_Y})`}
        >
          <HousePlant palette={palette} stage={stage} />
        </G>
      </Svg>
    </View>
  );
}

function PlantPot({ palette }: { palette: PlantPalette }) {
  return (
    <>
      <Path d="M76 126 H144 L136 170 H84 Z" fill={palette.pot} />
      <Rect x="72" y="118" width="76" height="14" rx="3" fill={palette.potRim} />
      <Ellipse cx="110" cy="126" rx="31" ry="5" fill={palette.soil} />
    </>
  );
}

function HousePlant({ palette, stage }: { palette: PlantPalette; stage: PlantStage }) {
  if (stage === 'seed') {
    return (
      <>
        <Circle cx="105" cy="122" r="3" fill={palette.soil} />
        <Circle cx="113" cy="121" r="2.5" fill={palette.soil} />
      </>
    );
  }

  const leafCount = stage === 'seedling' ? 2 : stage === 'sprout' ? 4 : 6;
  const isTall = stage === 'young_tree' || stage === 'mature_tree';
  const isFull = stage === 'mature_tree';

  return (
    <>
      <Line
        x1="110"
        y1="126"
        x2="110"
        y2={isTall ? 62 : 88}
        stroke={palette.stem}
        strokeWidth={isTall ? 5 : 3}
        strokeLinecap="round"
      />

      {leafCount >= 2 && (
        <>
          <Leaf cx={94} cy={112} rx={20} ry={10} rotate={-32} palette={palette} />
          <Leaf cx={126} cy={110} rx={20} ry={10} rotate={32} palette={palette} />
        </>
      )}
      {leafCount >= 4 && (
        <>
          <Leaf cx={88} cy={92} rx={23} ry={11} rotate={-24} palette={palette} dark />
          <Leaf cx={132} cy={91} rx={23} ry={11} rotate={24} palette={palette} />
        </>
      )}
      {leafCount >= 6 && (
        <>
          <Leaf cx={100} cy={74} rx={22} ry={10} rotate={-48} palette={palette} />
          <Leaf cx={122} cy={73} rx={22} ry={10} rotate={48} palette={palette} dark />
        </>
      )}
      {isTall && (
        <Leaf
          cx={110}
          cy={58}
          rx={isFull ? 24 : 18}
          ry={isFull ? 12 : 9}
          rotate={-90}
          palette={palette}
        />
      )}
    </>
  );
}

function Leaf({
  cx,
  cy,
  rx,
  ry,
  rotate,
  palette,
  dark,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate: number;
  palette: PlantPalette;
  dark?: boolean;
}) {
  const fill = dark ? palette.leafDark : palette.leaf;
  return (
    <G transform={`rotate(${rotate} ${cx} ${cy})`}>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />
      <Line
        x1={cx - rx * 0.65}
        y1={cy}
        x2={cx + rx * 0.65}
        y2={cy}
        stroke={palette.stem}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.45}
      />
    </G>
  );
}

function getPlantPalette(hydration: PlantHydration): PlantPalette {
  switch (hydration) {
    case 'watered':
      return {
        pot: '#B86F45',
        potRim: '#D18A5F',
        soil: '#5A3B2E',
        leaf: '#4F9A64',
        leafDark: '#3E7F53',
        stem: '#3F7A4D',
      };
    case 'thirsty':
      return {
        pot: '#B9825D',
        potRim: '#D2A07F',
        soil: '#6B4A3D',
        leaf: '#8FA66F',
        leafDark: '#788E5E',
        stem: '#6F8359',
      };
    case 'wilted':
      return {
        pot: '#A7795D',
        potRim: '#BD9278',
        soil: '#6D5549',
        leaf: '#A59A72',
        leafDark: '#8D835F',
        stem: '#7F7657',
      };
  }
}

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
