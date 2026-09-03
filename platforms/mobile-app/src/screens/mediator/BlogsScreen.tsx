import React, {useEffect} from 'react';
import {View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useMediatorStore} from '../../store/mediatorStore';
import {Card, Button, StatusBadge, EmptyState} from '../../components/common';
import {colors, typography, spacing} from '../../theme';
import {formatDate, truncateText} from '../../utils/helpers';
import {Blog} from '../../types';

export function BlogsScreen({navigation}: {navigation: any}) {
  const {getMyBlogs, deleteBlog, blogs, isLoading} = useMediatorStore();

  useEffect(() => {
    getMyBlogs();
  }, [getMyBlogs]);

  const handleDelete = (blog: Blog) => {
    Alert.alert('Delete Blog', `Delete "${blog.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => deleteBlog(blog.id)},
    ]);
  };

  const renderBlog = ({item}: {item: Blog}) => (
    <Card style={styles.blogCard}>
      <View style={styles.blogHeader}>
        <Text style={styles.blogTitle} numberOfLines={2}>{item.title}</Text>
        <StatusBadge status={item.status} size="sm" />
      </View>
      {item.excerpt && (
        <Text style={styles.blogExcerpt} numberOfLines={2}>
          {truncateText(item.excerpt, 100)}
        </Text>
      )}
      <View style={styles.blogFooter}>
        <Text style={styles.blogDate}>{formatDate(item.created_at)}</Text>
        <View style={styles.blogActions}>
          <TouchableOpacity onPress={() => navigation.navigate('BlogEditor', {blog: item})}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Text style={styles.deleteLink}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Blogs</Text>
        <Button
          title="+ New Blog"
          onPress={() => navigation.navigate('BlogEditor')}
          size="sm"
          variant="outline"
        />
      </View>
      <FlatList
        data={blogs}
        renderItem={renderBlog}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={getMyBlogs} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No blogs yet"
              description="Start writing to share your expertise."
              actionLabel="Write Blog"
              onAction={() => navigation.navigate('BlogEditor')}
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
  blogCard: {marginBottom: spacing.md, padding: spacing.base},
  blogHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm},
  blogTitle: {...typography.body, fontWeight: '600', color: colors.text, flex: 1, marginRight: spacing.sm},
  blogExcerpt: {...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.sm},
  blogFooter: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  blogDate: {...typography.caption, color: colors.textMuted},
  blogActions: {flexDirection: 'row', gap: spacing.base},
  editLink: {...typography.caption, color: colors.primary, fontWeight: '600'},
  deleteLink: {...typography.caption, color: colors.danger, fontWeight: '600'},
});
