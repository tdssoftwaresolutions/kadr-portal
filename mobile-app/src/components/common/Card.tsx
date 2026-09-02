import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {colors} from '../../theme/colors';
import {borderRadius, spacing, shadows} from '../../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

export function Card({children, style, noPadding = false}: CardProps) {
  return (
    <View style={[styles.card, !noPadding && styles.padding, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  padding: {
    padding: spacing.base,
  },
});
