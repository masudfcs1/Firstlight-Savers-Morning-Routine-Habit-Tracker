import React, { type PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { layout, useAppTheme } from '../../theme';

export type ScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  padded?: boolean;
  keyboardAvoiding?: boolean;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: ScrollViewProps['refreshControl'];
  testID?: string;
}>;

export function Screen({
  children,
  scrollable = false,
  padded = true,
  keyboardAvoiding = false,
  edges = ['top', 'left', 'right'],
  style,
  contentContainerStyle,
  refreshControl,
  testID,
}: ScreenProps) {
  const { colors } = useAppTheme();
  const contentStyle = [
    styles.content,
    padded && styles.padded,
    contentContainerStyle,
  ];

  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      testID={testID}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={contentStyle} testID={testID}>
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor: colors.background }, style]}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  padded: { paddingHorizontal: layout.screenPadding },
});
