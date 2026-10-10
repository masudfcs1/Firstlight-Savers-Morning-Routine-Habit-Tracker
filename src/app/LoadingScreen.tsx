import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '../components/ui';
import { palette, radii, spacing, useAppTheme } from '../theme';

export function LoadingScreen() {
  const rotation = useSharedValue(0);
  const { reduceMotion: userReduceMotion } = useAppTheme();
  const reduceMotion = useReducedMotion() || userReduceMotion;

  useEffect(() => {
    if (!reduceMotion) {
      rotation.value = withRepeat(
        withTiming(1, { duration: 2800, easing: Easing.linear }),
        -1,
      );
    }
  }, [reduceMotion, rotation]);

  const rayStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  return (
    <LinearGradient
      colors={[palette.forestDark, palette.forest, '#28584B']}
      style={styles.container}
    >
      <View style={styles.markWrap} accessibilityLabel="FirstLight is loading">
        <Animated.View style={[styles.rays, rayStyle]}>
          {Array.from({ length: 8 }).map((_, index) => (
            <View
              // A static visual-only list; the index is stable.
              key={index}
              style={[styles.ray, { transform: [{ rotate: `${index * 45}deg` }] }]}
            />
          ))}
        </Animated.View>
        <View style={styles.sun} />
      </View>
      <AppText variant="title" color={palette.ivory} align="center">
        FirstLight
      </AppText>
      <AppText color={palette.sageLight} align="center" style={styles.subtitle}>
        Begin gently. Grow steadily.
      </AppText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  markWrap: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  rays: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
  },
  ray: {
    position: 'absolute',
    width: 3,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(232,173,99,0.48)',
    transformOrigin: 'center 54px',
  },
  sun: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: palette.amber,
    borderWidth: 9,
    borderColor: 'rgba(250,247,240,0.16)',
  },
  subtitle: { opacity: 0.84 },
});
