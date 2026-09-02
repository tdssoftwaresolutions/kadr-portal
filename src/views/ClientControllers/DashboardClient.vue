<template>
  <b-container fluid class="dashboard-client-page">
    <kadr-dashboard-hero
      :name="user.name"
      :email="user.email"
      :avatar-url="avatarUrl"
      :stats="heroStats"
    />

    <div class="workspace-grid workspace-grid--single">
      <iq-card class="workspace-card schedule-card">
        <template v-slot:headerTitle>
          <h4 class="card-title">Today's Schedule</h4>
        </template>
        <template v-slot:body>
          <div v-if="todaysEvents.length" class="list-scroll">
            <div
              v-for="(event, index) in todaysEvents"
              :key="index"
              class="schedule-item"
            >
              <div class="schedule-main">
                <i class="ri-checkbox-blank-circle-fill schedule-dot" :style="{ color: kadrEventColor }"></i>
                <div class="schedule-text">
                  <h6>Case #{{ event.caseId }}</h6>
                  <p>{{ event.caseFirstPartyName }} vs {{ event.caseSecondPartyName }}</p>
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

    <div v-if="actionCards.length" class="section-card action-required-section mb-3">
      <div class="section-head">
        <h5>
          <i class="fas fa-exclamation-circle section-icon"></i>
          Action Required
        </h5>
        <small>Complete pending steps across your cases.</small>
      </div>
      <div class="action-grid">
        <article
          v-for="item in actionCards"
          :key="item.key"
          class="action-card action-card--clickable"
          :class="item.variant"
          role="button"
          tabindex="0"
          @click="focusWorkspace(item)"
          @keyup.enter="focusWorkspace(item)"
        >
          <h6>
            <i class="fas fa-angle-right action-card-icon"></i>
            {{ item.title }}
          </h6>
          <p>{{ item.description }}</p>
          <button
            type="button"
            class="btn btn-sm btn-light"
            @click.stop="runWorkspaceAction(item)"
          >
            {{ item.buttonText }}
          </button>
        </article>
      </div>
    </div>

    <client-cases
      ref="clientCases"
      :userid="user.id"
      :content="content"
      @refresh-dashboard="$emit('refresh-dashboard')"
    />
  </b-container>
</template>
<script>
import ClientCases from './ClientCases.vue'
import KadrDashboardHero from '../../components/kadr/KadrDashboardHero.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'
import { DASHBOARD } from '../../constants/messages'
import { formatTime } from '../../utils/dateFormat'

const KADR_EVENT_COLOR = 'rgb(121, 134, 203)'

export default {
  name: 'DashboardClient',
  props: {
    user: null,
    content: null
  },
  components: {
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
    myCases () {
      return this.content.myCases || []
    },
    todaysEvents () {
      return this.content.todaysEvent || []
    },
    avatarUrl () {
      return (this.content.user && this.content.user.profile_picture_url) || ''
    },
    heroStats () {
      return [
        { key: 'cases', label: 'Ongoing Cases', value: this.myCases.length },
        { key: 'meetings', label: 'Meetings Today', value: this.todaysEvents.length }
      ]
    },
    actionCards () {
      const cards = []
      const userid = this.user && this.user.id
      if (!userid) return cards

      for (const c of this.myCases) {
        const isSecondParty = userid === c.user_cases_second_partyTouser?.id
        const isFirstParty = userid === c.user_cases_first_partyTouser?.id
        const caseLabel = c.caseId ? `Case #${c.caseId}` : 'a case'

        if (
          c.case_statuses?.id === 'in_progress' &&
          c.case_sub_statuses?.id === 'notice_sent_to_opposite_party' &&
          isSecondParty
        ) {
          cards.push({
            key: `accept-${c.id}`,
            caseId: c.id,
            title: 'Accept mediation',
            description: `${caseLabel}: review the notice and pay Rs. 1000 to continue.`,
            buttonText: 'I Accept',
            trigger: 'payment',
            paymentType: 'notice',
            variant: 'success'
          })
        }

        if (c.case_sub_statuses?.id === 'pending_notice_payment' && isFirstParty) {
          cards.push({
            key: `notice-pay-${c.id}`,
            caseId: c.id,
            title: 'Notice payment due',
            description: `${caseLabel}: pay Rs. 1000 to dispatch the legal notice.`,
            buttonText: 'Pay Rs. 1000',
            trigger: 'payment',
            paymentType: 'notice',
            variant: 'primary'
          })
        }

        if (c.case_sub_statuses?.id === 'pending_mediation_payment' && isFirstParty) {
          cards.push({
            key: `mediation-pay-${c.id}`,
            caseId: c.id,
            title: 'Mediation fee due',
            description: `${caseLabel}: pay Rs. 5000 to assign a mediator.`,
            buttonText: 'Pay Rs. 5000',
            trigger: 'payment',
            paymentType: 'mediation',
            variant: 'warning'
          })
        }

        if (
          c.case_statuses?.name === 'In Progress' &&
          c.agreement_status === 'pending_signature'
        ) {
          cards.push({
            key: `sign-${c.id}`,
            caseId: c.id,
            title: 'Signature needed',
            description: `${caseLabel}: sign the mediation agreement to continue.`,
            buttonText: 'Sign Agreement',
            trigger: 'sign',
            variant: 'success'
          })
        }
      }

      return cards
    }
  },
  methods: {
    scrollToCasesWorkspace () {
      this.$nextTick(() => {
        const el = document.getElementById('cases-workspace')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
    focusWorkspace (item) {
      const casesRef = this.$refs.clientCases
      if (casesRef && item.caseId) {
        casesRef.selectCaseById(item.caseId)
      }
      this.scrollToCasesWorkspace()
    },
    runWorkspaceAction (item) {
      const casesRef = this.$refs.clientCases
      if (casesRef) {
        casesRef.runDashboardAction({
          caseId: item.caseId,
          trigger: item.trigger,
          paymentType: item.paymentType
        })
      }
      this.scrollToCasesWorkspace()
    },
    formatDate (dateString) {
      return formatTime(dateString)
    }
  }
}
</script>
