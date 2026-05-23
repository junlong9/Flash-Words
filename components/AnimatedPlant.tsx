import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Plant, type PlantProps } from './Plant';

type Props = PlantProps & {
  /** Increment to trigger a water splash / bounce animation. */
  waterPulse?: number;
  /** Increment to trigger a shrink animation when rewinding growth. */
  rewindPulse?: number;
};

export function AnimatedPlant({
  waterPulse = 0,
  rewindPulse = 0,
  foliageScale = 1,
  ...plantProps
}: Props) {
  const bounce = useSharedValue(1);
  const sway = useSharedValue(0);
  const growth = useSharedValue(foliageScale);
  const droplet = useSharedValue(0);

  useEffect(() => {
    growth.value = withSpring(foliageScale, { damping: 16, stiffness: 120 });
  }, [foliageScale, growth]);

  useEffect(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 3200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [sway]);

  useEffect(() => {
    if (waterPulse <= 0) return;
    bounce.value = withSequence(
      withSpring(1.07, { damping: 6, stiffness: 220 }),
      withSpring(1, { damping: 11, stiffness: 160 })
    );
    droplet.value = 0;
    droplet.value = withSequence(
      withTiming(1, { duration: 180 }),
      withTiming(0, { duration: 520 })
    );
  }, [waterPulse, bounce, droplet]);

  useEffect(() => {
    if (rewindPulse <= 0) return;
    bounce.value = withSequence(
      withSpring(0.93, { damping: 10, stiffness: 200 }),
      withSpring(1, { damping: 14, stiffness: 140 })
    );
  }, [rewindPulse, bounce]);

  const plantStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: bounce.value },
      { rotate: `${sway.value * 1.4}deg` },
    ],
  }));

  const dropletStyle = useAnimatedStyle(() => ({
    opacity: droplet.value * 0.85,
    transform: [
      { translateY: -12 - droplet.value * 28 },
      { scale: 0.6 + droplet.value * 0.5 },
    ],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.droplet, dropletStyle]} />
      <Animated.View style={plantStyle}>
        <Plant {...plantProps} foliageScale={foliageScale} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  droplet: {
    position: 'absolute',
    top: 48,
    width: 6,
    height: 8,
    borderRadius: 3,
    backgroundColor: '#6FA86F',
    opacity: 0,
  },
});
