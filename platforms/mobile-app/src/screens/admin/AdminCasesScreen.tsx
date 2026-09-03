import React, {useEffect} from 'react';
import {View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAdminStore} from '../../store/adminStore';
import {Card, StatusBadge, EmptyState} from '../../components/common';
import {colors, typography, spacing} from '../../theme';
import {formatDate} from '../../utils/helpers';
import {Case} from '../../types';

export function AdminCasesScreen({navigation}: {navigation: any}) {
  const {getActiveCases, activeCases, isLoading} = useAdminStore();

  useEffect(() => {
    getActiveCases();
  }, [getActiveCases]);

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
        <View style={styles.parties}>
          {item.first_party && <Text style={styles.partyText}>{item.first_party.name}</Text>}
          {item.second_party && <Text style={styles.partyText}>vs {item.second_party.name}</Text>}
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          {item.mediator && <Text style={styles.mediatorText}>{item.mediator.name}</Text>}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Case Management</Text>
      </View>
      <FlatList
        data={activeCases}
        renderItem={renderCase}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={getActiveCases} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState title="No active cases" description="Active cases will appear here." />
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {padding: spacing.base},
  title: {...typography.h3, color: colors.text},
  list: {padding: spacing.base, paddingTop: 0},
  caseCard: {marginBottom: spacing.md, padding: spacing.base},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs},
  caseNumber: {...typography.body, fontWeight: '600', color: colors.text, flex: 1, marginRight: spacing.sm},
  caseType: {...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs},
  parties: {marginBottom: spacing.sm},
  partyText: {...typography.bodySmall, color: colors.text},
  cardFooter: {flexDirection: 'row', justifyContent: 'space-between'},
  dateText: {...typography.caption, color: colors.textMuted},
  mediatorText: {...typography.caption, color: colors.primary, fontWeight: '500'},
});
