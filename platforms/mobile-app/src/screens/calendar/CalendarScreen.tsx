import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppStore} from '../../store/appStore';
import {Card, Button, EmptyState} from '../../components/common';
import {colors, typography, spacing, borderRadius} from '../../theme';
import {formatDate, formatDateTime} from '../../utils/helpers';
import {CalendarEvent} from '../../types';

export function CalendarScreen({navigation}: {navigation: any}) {
  const {getCalendarInit, calendarEvents, isLoading} = useAppStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadCalendar = useCallback(async () => {
    await getCalendarInit();
  }, [getCalendarInit]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const todayEvents = calendarEvents.filter(e => {
    const eventDate = new Date(e.start).toDateString();
    const compareDate = selectedDate
      ? new Date(selectedDate).toDateString()
      : new Date().toDateString();
    return eventDate === compareDate;
  });

  const upcomingEvents = calendarEvents
    .filter(e => new Date(e.start) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const renderEvent = (event: CalendarEvent) => (
    <Card key={event.id} style={styles.eventCard}>
      <View style={styles.eventRow}>
        <View style={styles.eventTime}>
          <Text style={styles.eventTimeText}>{formatDate(event.start, 'HH:mm')}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {event.description && (
            <Text style={styles.eventDesc} numberOfLines={2}>{event.description}</Text>
          )}
          {event.meeting_link && (
            <TouchableOpacity style={styles.joinLink}>
              <Text style={styles.joinLinkText}>Join Meeting</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.eventDateFull}>{formatDateTime(event.start)}</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <Button
          title="+ New Event"
          onPress={() => navigation.navigate('NewEvent')}
          size="sm"
          variant="outline"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadCalendar} />}>
        {/* Today's events section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedDate ? formatDate(selectedDate, 'DD MMMM YYYY') : "Today's Meetings"}
          </Text>
          {todayEvents.length > 0 ? (
            todayEvents.map(renderEvent)
          ) : (
            <Card style={styles.noEvents}>
              <Text style={styles.noEventsText}>No meetings scheduled</Text>
            </Card>
          )}
        </View>

        {/* Upcoming events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          {upcomingEvents.length > 0 ? (
            upcomingEvents.slice(0, 10).map(renderEvent)
          ) : (
            <EmptyState
              title="No upcoming meetings"
              description="Your scheduled meetings will appear here."
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
  },
  title: {...typography.h3, color: colors.text},
  scrollContent: {padding: spacing.base, paddingTop: 0},
  section: {marginBottom: spacing.xl},
  sectionTitle: {...typography.h4, color: colors.text, marginBottom: spacing.md},
  eventCard: {marginBottom: spacing.md, padding: spacing.base},
  eventRow: {flexDirection: 'row', gap: spacing.md},
  eventTime: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  eventTimeText: {...typography.caption, fontWeight: '700', color: colors.primary},
  eventInfo: {flex: 1},
  eventTitle: {...typography.body, fontWeight: '600', color: colors.text, marginBottom: 2},
  eventDesc: {...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs},
  eventDateFull: {...typography.caption, color: colors.textMuted, marginTop: spacing.xs},
  joinLink: {marginTop: spacing.xs},
  joinLinkText: {...typography.caption, color: colors.primary, fontWeight: '600'},
  noEvents: {padding: spacing.base, alignItems: 'center'},
  noEventsText: {...typography.bodySmall, color: colors.textSecondary},
});
