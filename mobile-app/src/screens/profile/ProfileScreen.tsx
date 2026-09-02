import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuthStore} from '../../store/authStore';
import {useAppStore} from '../../store/appStore';
import {Card, Button, Input, Avatar} from '../../components/common';
import {colors, typography, spacing} from '../../theme';
import {getUserTypeLabel} from '../../utils/helpers';

export function ProfileScreen({navigation}: {navigation: any}) {
  const {user, logout} = useAuthStore();
  const {updateUserProfile, deleteMyAccount, isLoading} = useAppStore();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [city, setCity] = useState(user?.city || '');

  const handleSave = async () => {
    const result = await updateUserProfile({name, phone_number: phone, city});
    if (result.success) {
      setIsEditing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be removed.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteMyAccount();
            if (result.success) {
              await logout();
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <Avatar name={user?.name || 'User'} size={80} />
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {getUserTypeLabel(user?.user_type || '')}
            </Text>
          </View>
        </View>

        {/* Profile info/edit */}
        <Card style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Personal Information</Text>
            <Button
              title={isEditing ? 'Cancel' : 'Edit'}
              onPress={() => setIsEditing(!isEditing)}
              variant="ghost"
              size="sm"
            />
          </View>

          {isEditing ? (
            <View>
              <Input label="Full Name" value={name} onChangeText={setName} autoCapitalize="words" />
              <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Input label="City" value={city} onChangeText={setCity} autoCapitalize="words" />
              <Button title="Save Changes" onPress={handleSave} loading={isLoading} />
            </View>
          ) : (
            <View style={styles.infoRows}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{user?.name || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{user?.phone_number || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>City</Text>
                <Text style={styles.infoValue}>{user?.city || '-'}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Button title="Sign Out" onPress={handleLogout} variant="outline" size="lg" style={styles.logoutButton} />
          <Button
            title="Delete Account"
            onPress={handleDeleteAccount}
            variant="danger"
            size="sm"
            style={styles.deleteButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  scrollContent: {padding: spacing.base},
  profileHeader: {alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.lg},
  userName: {...typography.h3, color: colors.text, marginTop: spacing.md},
  userEmail: {...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs},
  badge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    marginTop: spacing.sm,
  },
  badgeText: {...typography.caption, color: colors.primary, fontWeight: '600'},
  infoCard: {marginBottom: spacing.xl, padding: spacing.base},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.base},
  cardTitle: {...typography.h4, color: colors.text},
  infoRows: {gap: spacing.md},
  infoRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm},
  infoLabel: {...typography.bodySmall, color: colors.textSecondary},
  infoValue: {...typography.body, color: colors.text, fontWeight: '500'},
  actionsSection: {marginTop: spacing.xl, gap: spacing.md},
  logoutButton: {borderColor: colors.textSecondary},
  deleteButton: {alignSelf: 'center', marginTop: spacing.lg},
});
