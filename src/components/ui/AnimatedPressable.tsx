import React, { useCallback } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion, useAppTheme } from '../../theme';

/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally mutable. */

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressHaptic = 'none' | 'selection' | 'light' | 'medium';

export type AnimatedPressableProps = Omit<PressableProps, 'style' | 'onPress'> & {
  style?: StyleProp<ViewStyle> | undefined;
  pressedScale?: number | undefined;
  haptic?: PressHaptic | undefined;
  onPress?: ((event: GestureResponderEvent) => void) | undefined;
};

async function performHaptic(haptic: PressHaptic) {
  if (haptic === 'none') return;
  try {
    if (haptic === 'selection') {
      await Haptics.selectionAsync();
    } else {
      await Haptics.impactAsync(
        haptic === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light,
      );
    }
  } catch {
    // Haptics are an enhancement and can be unavailable in simulators or web.
  }
}

export function AnimatedPressable({
  children,
  style,
  pressedScale = 0.97,
  haptic = 'none',
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);
  const systemReduceMotion = useReducedMotion();
  const { reduceMotion: userReduceMotion, hapticsEnabled } = useAppTheme();
  const reduceMotion = systemReduceMotion || userReduceMotion;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.52 : 1 - pressed.value * 0.04,
  }));

  const animateTo = useCallback(
    (nextScale: number, nextPressed: number) => {
      if (reduceMotion) {
        scale.value = 1;
        pressed.value = nextPressed;
        return;
      }
      scale.value = withSpring(nextScale, motion.spring);
      pressed.value = withTiming(nextPressed, { duration: motion.quick });
    },
    [pressed, reduceMotion, scale],
  );

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (hapticsEnabled) void performHaptic(haptic);
      onPress?.(event);
    },
    [haptic, hapticsEnabled, onPress],
  );

  return (
    <ReanimatedPressable
      disabled={disabled}
      onPress={handlePress}
      onPressIn={(event) => {
        animateTo(pressedScale, 1);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateTo(1, 0);
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
      {...props}
    >
      {children}
    </ReanimatedPressable>
  );
}
