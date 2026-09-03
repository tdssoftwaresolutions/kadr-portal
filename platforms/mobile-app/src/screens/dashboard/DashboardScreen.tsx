import React, {useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuthStore} from '../../store/authStore';
import {useAppStore} from '../../store/appStore';
import {Card, Avatar, StatusBadge, EmptyState} from '../../components/common';
import {colors, typography, spacing, borderRadius} from '../../theme';
import {formatDate, formatRelativeTime, getUserTypeLabel} from '../../utils/helpers';
import {DashboardContent, Case, CalendarEvent} from '../../types';

export function DashboardScreen({navigation}: {navigation: any}) {
  const {user} = useAuthStore();
  const {getDashboardContent, dashboardContent, isLoading, invalidateCaches} =
    useAppStore();

  const loadDashboard = useCallback(async () => {
    await getDashboardContent();
  }, [getDashboardContent]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    invalidateCaches();
    loadDashboard();
  };

  const renderWelcome = () => (
    <View style={styles.welcomeSection}>
      <View style={styles.welcomeRow}>
        <Avatar name={user?.name || 'User'} size={48} />
        <View style={styles.welcomeText}>
          <Text style={styles.greeting}>
            Welcome back, {user?.name?.split(' ')[0]}
          </Text>
          <Text style={styles.role}>{getUserTypeLabel(user?.user_type || '')}</Text>
        </View>
      </View>
    </View>
  );

  const renderStats = (content: DashboardContent) => {
    const stats = content.stats;
    if (!stats) return null;

    return (
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.activeCases || 0}</Text>
          <Text style={styles.statLabel}>Active Cases</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.resolvedCases || 0}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statNumber, {color: colors.warning}]}>
            {stats.pendingPayments || 0}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </Card>
      </View>
    );
  };

  const renderActiveCases = (cases: Case[]) => {
    if (!cases?.length) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Cases</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PastMediations')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {cases.slice(0, 3).map(c => (
          <Card key={c.id} style={styles.caseCard}>
            <View style={styles.caseCardHeader}>
              <Text style={styles.caseTitle} numberOfLines={1}>
                {c.title || c.case_number || `Case #${c.id.slice(0, 8)}`}
              </Text>
              <StatusBadge status={c.status} size="sm" />
            </View>
            {c.case_type && (
              <Text style={styles.caseType}>{c.case_type}</Text>
            )}
            <Text style={styles.caseDate}>
              Started {formatDate(c.created_at)}
            </Text>
          </Card>
        ))}
      </View>
    );
  };

  const renderUpcomingMeetings = (meetings: CalendarEvent[]) => {
    if (!meetings?.length) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Meetings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {meetings.slice(0, 3).map(m => (
          <Card key={m.id} style={styles.meetingCard}>
            <View style={styles.meetingDate}>
              <Text style={styles.meetingDay}>{formatDate(m.start, 'DD')}</Text>
              <Text style={styles.meetingMonth}>{formatDate(m.start, 'MMM')}</Text>
            </View>
            <View style={styles.meetingInfo}>
              <Text style={styles.meetingTitle} numberOfLines={1}>{m.title}</Text>
              <Text style={styles.meetingTime}>
                {formatDate(m.start, 'hh:mm A')}
              </Text>
            </View>
          </Card>
        ))}
      </View>
    );
  };

  const renderPendingActions = () => {
    const actions = dashboardContent?.pendingActions;
    if (!actions?.length) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Actions</Text>
        {actions.slice(0, 5).map(action => (
          <Card key={action.id} style={styles.actionCard}>
            <View
              style={[
                styles.actionDot,
                {
                  backgroundColor:
                    action.priority === 'high'
                      ? colors.danger
                      : action.priority === 'medium'
                        ? colors.warning
                        : colors.info,
                },
              ]}
            />
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              {action.description && (
                <Text style={styles.actionDesc} numberOfLines={1}>
                  {action.description}
                </Text>
              )}
            </View>
          </Card>
        ))}
      </View>
    );
  };

  const renderRecentActivity = () => {
    const activity = dashboardContent?.recentActivity;
    if (!activity?.length) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {activity.slice(0, 5).map(item => (
          <View key={item.id} style={styles.activityItem}>
            <View style={styles.activityDot} />
            <View style={styles.activityContent}>
              <Text style={styles.activityMessage}>{item.message}</Text>
              <Text style={styles.activityTime}>
                {formatRelativeTime(item.timestamp)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}>
        {renderWelcome()}

        {dashboardContent ? (
          <>
            {renderStats(dashboardContent)}
            {renderPendingActions()}
            {renderActiveCases(dashboardContent.activeCases || [])}
            {renderUpcomingMeetings(dashboardContent.upcomingMeetings || [])}
            {renderRecentActivity()}
          </>
        ) : !isLoading ? (
          <EmptyState
            title="Welcome to Kadr"
            description="Your dashboard will show your cases, meetings, and activity here."
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  scrollContent: {padding: spacing.base, paddingBottom: spacing.xxxl},
  welcomeSection: {marginBottom: spacing.lg},
  welcomeRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  welcomeText: {flex: 1},
  greeting: {...typography.h3, color: colors.text},
  role: {...typography.bodySmall, color: colors.textSecondary, marginTop: 2},
  statsRow: {flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg},
  statCard: {flex: 1, alignItems: 'center', padding: spacing.md},
  statNumber: {...typography.h2, color: colors.primary},
  statLabel: {...typography.caption, color: colors.textSecondary, marginTop: 2},
  section: {marginBottom: spacing.xl},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md},
  sectionTitle: {...typography.h4, color: colors.text, marginBottom: spacing.md},
  seeAll: {...typography.bodySmall, color: colors.primary, fontWeight: '600'},
  caseCard: {marginBottom: spacing.md, padding: spacing.base},
  caseCardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  caseTitle: {...typography.body, fontWeight: '600', color: colors.text, flex: 1, marginRight: spacing.sm},
  caseType: {...typography.caption, color: colors.textSecondary, marginTop: spacing.xs},
  caseDate: {...typography.caption, color: colors.textMuted, marginTop: spacing.xs},
  meetingCard: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm, padding: spacing.md},
  meetingDate: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    width: 48,
  },
  meetingDay: {...typography.h4, color: colors.primary},
  meetingMonth: {...typography.caption, color: colors.primary, fontWeight: '600'},
  meetingInfo: {flex: 1},
  meetingTitle: {...typography.body, fontWeight: '500', color: colors.text},
  meetingTime: {...typography.caption, color: colors.textSecondary, marginTop: 2},
  actionCard: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm, padding: spacing.md},
  actionDot: {width: 8, height: 8, borderRadius: 4},
  actionInfo: {flex: 1},
  actionTitle: {...typography.bodySmall, fontWeight: '600', color: colors.text},
  actionDesc: {...typography.caption, color: colors.textSecondary, marginTop: 2},
  activityItem: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md},
  activityDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6},
  activityContent: {flex: 1},
  activityMessage: {...typography.bodySmall, color: colors.text},
  activityTime: {...typography.caption, color: colors.textMuted, marginTop: 2},
});
