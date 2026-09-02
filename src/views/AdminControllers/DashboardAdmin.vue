<template>
  <b-container fluid class="dashboard-client-page">
    <kadr-dashboard-hero
      :name="user.name"
      :email="user.email"
      :avatar-url="(user && user.photo) || ''"
      :stats="heroStats"
    />
    <div class="workspace-grid" v-if="showSchedule">
      <iq-card class="workspace-card">
        <template v-slot:headerTitle>
          <h4 class="card-title">Today's Schedule</h4>
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
                  <h6>Case #{{ event.caseId || '-' }}</h6>
                  <p>{{ event.caseFirstPartyName || '-' }} vs {{ event.caseSecondPartyName || '-' }}</p>
                  <span>{{ formatDate(event.start_datetime) }} - {{ formatDate(event.end_datetime) }}</span>
                </div>
              </div>
              <a
                v-if="event.meeting_link"
                :href="event.meeting_link"
                target="_blank"
                class="btn btn-primary btn-sm"
              >
                Join
              </a>
            </div>
          </div>
          <kadr-empty-state
            v-else
            compact
            icon=""
            :description="DASHBOARD.NO_MEETINGS_TODAY"
          />
        </template>
      </iq-card>
    </div>
    <b-row class="cases-workspace" v-if="showApprovals">
      <b-col sm="12" class="cases-overview">
         <div class="overview-head">
          <h4>Approvals</h4>
          <p>Manage and approve new client and mediator requests</p>
        </div>
        <section no-body >
          <b-tabs card header-class="bg-transparent border-0" nav-class="bg-transparent">
            <b-tab :title="'New Clients ('+content.inactive_users.total+')'" active><p>
              <inactive-users :users="content.inactive_users" type="CLIENT"></inactive-users>
            </p></b-tab>
            <b-tab :title="'New Dispute Resolution Experts ('+content.inactive_mediators.total+')'"><p>
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
import { DASHBOARD } from '../../constants/messages'
import { adminUserHasComponent } from '../../utils/adminAccess'
const KADR_EVENT_COLOR = 'rgb(121, 134, 203)'

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
      kadrEventColor: KADR_EVENT_COLOR,
      DASHBOARD
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
          { key: 'mediators', label: 'Mediators', value: this.content.count.mediators },
          { key: 'clients', label: 'Clients', value: this.content.count.clients },
          { key: 'cases', label: 'Cases', value: this.content.count.cases }
        )
      }
      if (this.showSchedule) {
        stats.push({ key: 'meetings', label: 'Meetings Today', value: this.todaysEvents.length })
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
