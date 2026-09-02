import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppStore} from '../../store/appStore';
import {Card, Button, Avatar, StatusBadge} from '../../components/common';
import {colors, typography, spacing, borderRadius} from '../../theme';
import {formatDate} from '../../utils/helpers';

type Tab = 'details' | 'correspondence' | 'notes';

export function CaseDetailScreen({route, navigation}: {route: any; navigation: any}) {
  const {caseId} = route.params || {};
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const {markCaseResolved, acceptMediationRequest} = useAppStore();

  // In a real app, you'd fetch the case from store/API
  // This is a placeholder structure
  const caseData = {
    id: caseId,
    title: 'Mediation Case',
    status: 'ACTIVE',
    case_type: 'Commercial Dispute',
    created_at: new Date().toISOString(),
    description: 'Case details will be loaded from API',
    first_party: {name: 'Party A'},
    second_party: {name: 'Party B'},
    mediator: {name: 'Assigned Mediator'},
  };

  const handleAcceptRequest = async () => {
    await acceptMediationRequest(caseId);
  };

  const tabs: {key: Tab; label: string}[] = [
    {key: 'details', label: 'Details'},
    {key: 'correspondence', label: 'Messages'},
    {key: 'notes', label: 'Notes'},
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Case header */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.caseTitle}>{caseData.title}</Text>
            <StatusBadge status={caseData.status} />
          </View>
          <Text style={styles.caseType}>{caseData.case_type}</Text>
          <Text style={styles.caseDate}>Started: {formatDate(caseData.created_at)}</Text>
        </Card>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {activeTab === 'details' && (
          <View style={styles.section}>
            <Card style={styles.partyCard}>
              <Text style={styles.sectionLabel}>Parties</Text>
              <View style={styles.partyRow}>
                <Avatar name={caseData.first_party.name} size={32} />
                <Text style={styles.partyName}>{caseData.first_party.name}</Text>
              </View>
              <View style={styles.partyRow}>
                <Avatar name={caseData.second_party.name} size={32} backgroundColor={colors.secondaryLight} />
                <Text style={styles.partyName}>{caseData.second_party.name}</Text>
              </View>
            </Card>

            <Card style={styles.partyCard}>
              <Text style={styles.sectionLabel}>Mediator</Text>
              <View style={styles.partyRow}>
                <Avatar name={caseData.mediator.name} size={32} backgroundColor={colors.primary} />
                <Text style={styles.partyName}>{caseData.mediator.name}</Text>
              </View>
            </Card>

            {caseData.description && (
              <Card style={styles.partyCard}>
                <Text style={styles.sectionLabel}>Description</Text>
                <Text style={styles.description}>{caseData.description}</Text>
              </Card>
            )}

            <View style={styles.actions}>
              <Button
                title="Accept Request"
                onPress={handleAcceptRequest}
                variant="primary"
                size="md"
              />
              <Button
                title="View Correspondence"
                onPress={() => setActiveTab('correspondence')}
                variant="outline"
                size="md"
              />
            </View>
          </View>
        )}

        {activeTab === 'correspondence' && (
          <View style={styles.section}>
            <Button
              title="Open Messages"
              onPress={() =>
                navigation.navigate('CaseCorrespondence', {caseId})
              }
              variant="primary"
            />
          </View>
        )}

        {activeTab === 'notes' && (
          <View style={styles.section}>
            <Button
              title="Add Note"
              onPress={() => navigation.navigate('CaseNotes', {caseId})}
              variant="outline"
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  scrollContent: {padding: spacing.base},
  headerCard: {marginBottom: spacing.base, padding: spacing.base},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm},
  caseTitle: {...typography.h4, color: colors.text, flex: 1, marginRight: spacing.sm},
  caseType: {...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xs},
  caseDate: {...typography.caption, color: colors.textMuted},
  tabRow: {flexDirection: 'row', backgroundColor: colors.divider, borderRadius: borderRadius.md, marginBottom: spacing.base, padding: 3},
  tab: {flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.sm},
  tabActive: {backgroundColor: colors.surface},
  tabText: {...typography.buttonSmall, color: colors.textSecondary},
  tabTextActive: {color: colors.primary},
  section: {marginBottom: spacing.xl},
  sectionLabel: {...typography.bodySmall, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.md},
  partyCard: {marginBottom: spacing.md, padding: spacing.base},
  partyRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm},
  partyName: {...typography.body, color: colors.text},
  description: {...typography.bodySmall, color: colors.text, lineHeight: 22},
  actions: {gap: spacing.md, marginTop: spacing.base},
});
