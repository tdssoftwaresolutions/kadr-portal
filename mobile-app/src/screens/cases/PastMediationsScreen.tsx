import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppStore} from '../../store/appStore';
import {Card, StatusBadge, EmptyState} from '../../components/common';
import {colors, typography, spacing} from '../../theme';
import {formatDate} from '../../utils/helpers';
import {Case} from '../../types';

export function PastMediationsScreen({navigation}: {navigation: any}) {
  const {getPastMediations, pastMediations, isLoading} = useAppStore();
  const [page, setPage] = useState(1);

  useEffect(() => {
    getPastMediations(page);
  }, [page, getPastMediations]);

  const onRefresh = () => {
    setPage(1);
    getPastMediations(1);
  };

  const renderCase = ({item}: {item: Case}) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('CaseDetail', {caseId: item.id})}
      activeOpacity={0.7}>
      <Card style={styles.caseCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.caseNumber} numberOfLines={1}>
            {item.title || item.case_number || `Case #${item.id.slice(0, 8)}`}
          </Text>
          <StatusBadge status={item.status} size="sm" />
        </View>
        {item.case_type && <Text style={styles.caseType}>{item.case_type}</Text>}
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          {item.mediator && (
            <Text style={styles.mediatorText}>Mediator: {item.mediator.name}</Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Past Mediations</Text>
      </View>
      <FlatList
        data={pastMediations}
        renderItem={renderCase}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No mediations yet"
              description="Your past mediation cases will appear here."
            />
          ) : undefined
        }
        onEndReached={() => setPage(p => p + 1)}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {padding: spacing.base, paddingBottom: spacing.sm},
  title: {...typography.h3, color: colors.text},
  list: {padding: spacing.base, paddingTop: 0},
  caseCard: {marginBottom: spacing.md, padding: spacing.base},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs},
  caseNumber: {...typography.body, fontWeight: '600', color: colors.text, flex: 1, marginRight: spacing.sm},
  caseType: {...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm},
  cardFooter: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  dateText: {...typography.caption, color: colors.textMuted},
  mediatorText: {...typography.caption, color: colors.textSecondary},
});
