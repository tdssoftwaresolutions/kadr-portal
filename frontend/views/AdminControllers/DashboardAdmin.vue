<template>
  <b-container fluid class="dashboard-client-page kadr-animate-in">
    <kadr-dashboard-hero
      :name="user.name"
      :email="user.email"
      :avatar-url="(user && user.photo) || ''"
      :stats="heroStats"
    />
    <div class="workspace-grid" v-if="showSchedule">
      <iq-card class="workspace-card">
        <template v-slot:headerTitle>
          <h4 class="card-title">{{ $t('adminDashboard.todaysSchedule') }}</h4>
        </template>
        <template v-slot:body>
          <div v-if="todaysEvents.length" class="list-scroll">
            <div
              v-for="(event, index) in todaysEvents"
              :key="`admin-today-event-${index}`"
              class="schedule-item"
            >
              <div class="schedule-main">
                <i class="ri-checkbox-blank-circle-fill schedule-dot" :style="{ color: kadrEventColor }"></i>
                <div class="schedule-text">
                  <h6>{{ $t('adminDashboard.caseNumber', { id: event.caseId || '-' }) }}</h6>
                  <p>{{ event.caseFirstPartyName || '-' }} {{ $t('adminDashboard.vs') }} {{ event.caseSecondPartyName || '-' }}</p>
                  <span>{{ formatDate(event.start_datetime) }} - {{ formatDate(event.end_datetime) }}</span>
                </div>
              </div>
              <a
                v-if="event.meeting_link"
                :href="event.meeting_link"
                target="_blank"
                class="btn btn-primary btn-sm"
              >
                {{ $t('adminDashboard.join') }}
              </a>
            </div>
          </div>
          <kadr-empty-state
            v-else
            compact
            icon=""
            :description="$t('adminDashboard.noMeetingsToday')"
          />
        </template>
      </iq-card>
    </div>
    <b-row class="cases-workspace" v-if="showApprovals">
      <b-col sm="12" class="cases-overview">
         <div class="overview-head">
          <h4>{{ $t('adminDashboard.approvals') }}</h4>
          <p>{{ $t('adminDashboard.approvalsSubtitle') }}</p>
        </div>
        <section no-body >
          <b-tabs card header-class="bg-transparent border-0" nav-class="bg-transparent">
            <b-tab :title="$t('adminDashboard.newClients', { count: content.inactive_users.total })" active><p>
              <inactive-users :users="content.inactive_users" type="CLIENT"></inactive-users>
            </p></b-tab>
            <b-tab :title="$t('adminDashboard.newExperts', { count: content.inactive_mediators.total })"><p>
              <inactive-users :users="content.inactive_mediators" type="MEDIATOR"></inactive-users>
            </p></b-tab>
          </b-tabs>
        </section>
      </b-col>
    </b-row>
    <client-cases v-if="showCasesWidget" :userid="user.id" :content="content" :allow-initiate-case="false"></client-cases>
  </b-container>
</template>
<script>
import InactiveUsers from '../AdminControllers/InactiveUsers.vue'
import ClientCases from '../ClientControllers/ClientCases.vue'
import KadrDashboardHero from '../../components/kadr/KadrDashboardHero.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'
import { adminUserHasComponent } from '../../utils/adminAccess'
const KADR_EVENT_COLOR = 'var(--kadr-event-kadr)'

export default {
  name: 'DashboardAdmin',
  props: {
    user: null,
    content: null
  },
  components: {
    InactiveUsers,
    ClientCases,
    KadrDashboardHero,
    KadrEmptyState
  },
  data () {
    return {
      kadrEventColor: KADR_EVENT_COLOR
    }
  },
  computed: {
    showStats () {
      return adminUserHasComponent(this.user, 'stats') && this.content && this.content.count
    },
    showSchedule () {
      return adminUserHasComponent(this.user, 'schedule')
    },
    showApprovals () {
      return adminUserHasComponent(this.user, 'approvals') && this.content && this.content.inactive_users
    },
    showCasesWidget () {
      return adminUserHasComponent(this.user, 'cases')
    },
    todaysEvents () {
      return this.content?.todaysEvent || []
    },
    heroStats () {
      const stats = []
      if (this.showStats) {
        stats.push(
          { key: 'mediators', label: this.$t('adminDashboard.statMediators'), value: this.content.count.mediators },
          { key: 'clients', label: this.$t('adminDashboard.statClients'), value: this.content.count.clients },
          { key: 'cases', label: this.$t('adminDashboard.statCases'), value: this.content.count.cases }
        )
      }
      if (this.showSchedule) {
        stats.push({ key: 'meetings', label: this.$t('adminDashboard.statMeetingsToday'), value: this.todaysEvents.length })
      }
      return stats
    }
  },
  methods: {
    formatDate (dateString) {
      return this.$formatTime(dateString)
    }
  }
}
</script>
<style scoped>
:deep(.card-header) {
  background-color: unset !important;
  border-bottom: unset !important;
}
</style>
