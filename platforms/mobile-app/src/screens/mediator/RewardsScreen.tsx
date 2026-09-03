import React, {useEffect} from 'react';
import {View, Text, StyleSheet, FlatList, RefreshControl, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useMediatorStore} from '../../store/mediatorStore';
import {Card, Button, EmptyState} from '../../components/common';
import {colors, typography, spacing, borderRadius} from '../../theme';
import {Reward} from '../../types';

export function RewardsScreen() {
  const {getMyRewards, redeemReward, rewards, subscription, isLoading} = useMediatorStore();

  useEffect(() => {
    getMyRewards();
  }, [getMyRewards]);

  const handleRedeem = (item: Reward) => {
    Alert.alert(
      'Redeem Reward',
      `Redeem "${item.name}" for ${item.points_required} points?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Redeem', onPress: () => redeemReward(item.id)},
      ],
    );
  };

  const renderReward = ({item}: {item: Reward}) => (
    <Card style={styles.rewardCard}>
      <View style={styles.rewardInfo}>
        <Text style={styles.rewardName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.rewardDesc} numberOfLines={2}>{item.description}</Text>
        )}
        <View style={styles.pointsRow}>
          <Text style={styles.pointsText}>{item.points_required} points</Text>
          {item.category && <Text style={styles.categoryText}>{item.category}</Text>}
        </View>
      </View>
      <Button
        title="Redeem"
        onPress={() => handleRedeem(item)}
        size="sm"
        disabled={!item.available}
      />
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Reward Store</Text>
        <View style={styles.subscriptionBadge}>
          <Text style={styles.subscriptionText}>{subscription.tier}</Text>
        </View>
      </View>

      <FlatList
        data={rewards}
        renderItem={renderReward}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { getMyRewards(); }} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No rewards available"
              description="Check back later for reward opportunities."
            />
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.base},
  title: {...typography.h3, color: colors.text},
  subscriptionBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  subscriptionText: {...typography.caption, color: colors.primary, fontWeight: '700'},
  list: {padding: spacing.base, paddingTop: 0},
  rewardCard: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, padding: spacing.base},
  rewardInfo: {flex: 1, marginRight: spacing.md},
  rewardName: {...typography.body, fontWeight: '600', color: colors.text},
  rewardDesc: {...typography.caption, color: colors.textSecondary, marginTop: 2},
  pointsRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs},
  pointsText: {...typography.caption, color: colors.primary, fontWeight: '700'},
  categoryText: {...typography.caption, color: colors.textMuted},
});
