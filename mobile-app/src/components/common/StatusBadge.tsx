import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {typography} from '../../theme/typography';
import {spacing, borderRadius} from '../../theme/spacing';
import {getCaseStatusColor} from '../../utils/helpers';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({status, size = 'md'}: StatusBadgeProps) {
  const color = getCaseStatusColor(status);

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        {backgroundColor: color + '20'},
      ]}>
      <View style={[styles.dot, {backgroundColor: color}]} />
      <Text style={[styles.text, size === 'sm' && styles.textSm, {color}]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  badgeSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  textSm: {
    fontSize: 10,
  },
});
