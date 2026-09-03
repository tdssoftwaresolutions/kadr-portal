import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAdminStore} from '../../store/adminStore';
import {Card, Avatar, Button, EmptyState} from '../../components/common';
import {colors, typography, spacing, borderRadius} from '../../theme';
import {getUserTypeLabel} from '../../utils/helpers';
import {User} from '../../types';

type Tab = 'active' | 'inactive';

export function AdminUsersScreen() {
  const {getActiveUsers, getInactiveUsers, updateInactiveUser, activeUsers, inactiveUsers, isLoading} = useAdminStore();
  const [tab, setTab] = useState<Tab>('active');

  useEffect(() => {
    if (tab === 'active') getActiveUsers();
    else getInactiveUsers();
  }, [tab, getActiveUsers, getInactiveUsers]);

  const handleActivate = (user: User) => {
    Alert.alert('Activate User', `Activate ${user.name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Activate', onPress: () => updateInactiveUser(user.id, true)},
    ]);
  };

  const users = tab === 'active' ? activeUsers : inactiveUsers;

  const renderUser = ({item}: {item: User}) => (
    <Card style={styles.userCard}>
      <View style={styles.userRow}>
        <Avatar name={item.name} size={40} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userType}>{getUserTypeLabel(item.user_type)}</Text>
        </View>
        {tab === 'inactive' && (
          <Button title="Activate" onPress={() => handleActivate(item)} size="sm" variant="outline" />
        )}
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'active' && styles.tabActive]}
          onPress={() => setTab('active')}>
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'inactive' && styles.tabActive]}
          onPress={() => setTab('inactive')}>
          <Text style={[styles.tabText, tab === 'inactive' && styles.tabTextActive]}>Pending</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        renderItem={renderUser}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => (tab === 'active' ? getActiveUsers() : getInactiveUsers())}
          />
        }
        ListEmptyComponent={!isLoading ? <EmptyState title="No users" description="No users in this category." /> : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {padding: spacing.base, paddingBottom: spacing.sm},
  title: {...typography.h3, color: colors.text},
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: borderRadius.md,
    margin: spacing.base,
    marginTop: 0,
    padding: 3,
  },
  tab: {flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.sm},
  tabActive: {backgroundColor: colors.surface},
  tabText: {...typography.buttonSmall, color: colors.textSecondary},
  tabTextActive: {color: colors.primary},
  list: {padding: spacing.base, paddingTop: 0},
  userCard: {marginBottom: spacing.md, padding: spacing.base},
  userRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  userInfo: {flex: 1},
  userName: {...typography.body, fontWeight: '600', color: colors.text},
  userEmail: {...typography.caption, color: colors.textSecondary},
  userType: {...typography.caption, color: colors.primary, fontWeight: '500', marginTop: 2},
});
