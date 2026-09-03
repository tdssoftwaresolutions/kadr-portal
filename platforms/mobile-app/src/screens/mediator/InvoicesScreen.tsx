import React, {useEffect} from 'react';
import {View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useMediatorStore} from '../../store/mediatorStore';
import {Card, StatusBadge, EmptyState} from '../../components/common';
import {colors, typography, spacing} from '../../theme';
import {formatDate, formatCurrency} from '../../utils/helpers';
import {Invoice} from '../../types';

export function InvoicesScreen({navigation}: {navigation: any}) {
  const {getInvoices, invoices, isLoading} = useMediatorStore();

  useEffect(() => {
    getInvoices();
  }, [getInvoices]);

  const renderInvoice = ({item}: {item: Invoice}) => (
    <TouchableOpacity activeOpacity={0.7}>
      <Card style={styles.invoiceCard}>
        <View style={styles.invoiceHeader}>
          <Text style={styles.invoiceNumber}>{item.invoice_number || `INV-${item.id.slice(0, 6)}`}</Text>
          <StatusBadge status={item.status} size="sm" />
        </View>
        <Text style={styles.invoiceAmount}>{formatCurrency(item.amount)}</Text>
        <View style={styles.invoiceFooter}>
          <Text style={styles.invoiceDate}>Created: {formatDate(item.created_at)}</Text>
          {item.due_date && (
            <Text style={styles.invoiceDate}>Due: {formatDate(item.due_date)}</Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
      </View>
      <FlatList
        data={invoices}
        renderItem={renderInvoice}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={getInvoices} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No invoices"
              description="Your invoices will appear here once cases are completed."
            />
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
  invoiceCard: {marginBottom: spacing.md, padding: spacing.base},
  invoiceHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm},
  invoiceNumber: {...typography.body, fontWeight: '600', color: colors.text},
  invoiceAmount: {...typography.h3, color: colors.primary, marginBottom: spacing.sm},
  invoiceFooter: {flexDirection: 'row', justifyContent: 'space-between'},
  invoiceDate: {...typography.caption, color: colors.textMuted},
});
