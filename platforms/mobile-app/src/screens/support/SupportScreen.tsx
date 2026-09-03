import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, FlatList, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppStore} from '../../store/appStore';
import {Card, Button, Input, EmptyState} from '../../components/common';
import {colors, typography, spacing} from '../../theme';
import {formatRelativeTime} from '../../utils/helpers';
import {SupportThread} from '../../types';

export function SupportScreen() {
  const {getSupportThreads, createSupportThread, supportThreads, isLoading} = useAppStore();
  const [showNewForm, setShowNewForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    getSupportThreads();
  }, [getSupportThreads]);

  const handleSubmit = async () => {
    if (!subject.trim() || !content.trim()) return;
    const result = await createSupportThread(subject.trim(), content.trim());
    if (result.success) {
      setShowNewForm(false);
      setSubject('');
      setContent('');
      getSupportThreads();
    }
  };

  const renderThread = ({item}: {item: SupportThread}) => (
    <Card style={styles.threadCard}>
      <View style={styles.threadHeader}>
        <Text style={styles.threadSubject} numberOfLines={1}>{item.subject}</Text>
        <View style={[styles.statusDot, {backgroundColor: item.status === 'open' ? colors.success : colors.textMuted}]} />
      </View>
      {item.last_message && (
        <Text style={styles.lastMessage} numberOfLines={2}>{item.last_message}</Text>
      )}
      <Text style={styles.threadTime}>{formatRelativeTime(item.created_at)}</Text>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Support</Text>
        <Button
          title={showNewForm ? 'Cancel' : '+ New'}
          onPress={() => setShowNewForm(!showNewForm)}
          size="sm"
          variant={showNewForm ? 'ghost' : 'outline'}
        />
      </View>

      {showNewForm && (
        <Card style={styles.formCard}>
          <Input label="Subject" placeholder="Brief description" value={subject} onChangeText={setSubject} />
          <Input
            label="Message"
            placeholder="Describe your issue..."
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
          />
          <Button title="Submit" onPress={handleSubmit} loading={isLoading} />
        </Card>
      )}

      <FlatList
        data={supportThreads}
        renderItem={renderThread}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { getSupportThreads(); }} />}
        ListEmptyComponent={
          !isLoading && !showNewForm ? (
            <EmptyState
              title="No support requests"
              description="Create a new support request if you need help."
              actionLabel="Create Request"
              onAction={() => setShowNewForm(true)}
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
  list: {padding: spacing.base, paddingTop: 0},
  formCard: {margin: spacing.base, marginTop: 0, padding: spacing.base},
  threadCard: {marginBottom: spacing.md, padding: spacing.base},
  threadHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs},
  threadSubject: {...typography.body, fontWeight: '600', color: colors.text, flex: 1},
  statusDot: {width: 8, height: 8, borderRadius: 4},
  lastMessage: {...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xs},
  threadTime: {...typography.caption, color: colors.textMuted},
});
