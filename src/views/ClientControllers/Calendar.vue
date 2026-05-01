<template>
  <b-container fluid>
    <b-row>
      <b-col md='12'>
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class='card-title'>Calendar</h4>
          </template>
          <template v-slot:body>
            <FullCalendar :calendarEvents="events" :eventClick="openDetailsModal" />
          </template>
        </iq-card>
      </b-col>
    </b-row>
    <b-modal id="view-appointment-modal-id" cancel-disabled ref="view-appointment-modal" size="lg" title="View Appointment" scrollable hide-footer>
      <div class="appointment-details" v-if="selectedAppointment != null">
        <div class="data-row">
            <div class="col-6">
                <div class="data-title">Title</div>
                <div>{{ selectedAppointment.title }}</div>
            </div>
            <div class="col-6">
                <div class="data-title">Meeting link</div>
                <div v-if="selectedAppointment.meetingLink"><a :href="selectedAppointment.meetingLink" target="_blank">Join</a></div>
                <div v-else class="text-muted">—</div>
            </div>
        </div>
        <div class="data-row">
            <div class="col-6">
                <div class="data-title">Start Time</div>
                <div>{{ formatDateTime(selectedAppointment.start) }}</div>
            </div>
            <div class="col-6">
                <div class="data-title">End Time</div>
                <div> {{ formatDateTime(selectedAppointment.end) }} </div>
            </div>
        </div>

        <div class="data-row" v-if="selectedAppointment.caseNumber">
            <div class="col-6">
                <div class="data-title">Case Id</div>
                <div>#{{ selectedAppointment.caseNumber }}</div>
            </div>
            <div class="col-6">
            </div>
        </div>
        <div class="long-description">
            <div class="data-title">Description</div>
            <textarea rows="5" readonly :value="selectedAppointment.description">
            </textarea>
        </div>
        <div v-if="selectedAppointment && calendarFeedbackHint" class="calendar-feedback-prompt">
          <p class="mb-2">{{ calendarFeedbackHint }}</p>
          <b-button variant="warning" size="sm" @click="openFeedbackFromCalendar">
            Rate meeting
          </b-button>
        </div>
        <b-button class="btn btn-primary" style="float:right;margin-top: 1rem;background: #0084ff;" @click="$bvModal.hide('view-appointment-modal-id')">Close</b-button>
      </div>
    </b-modal>

    <MeetingFeedbackModal
      v-model="calendarFeedbackModalVisible"
      modal-id="calendar-meeting-feedback-client"
      :role="calendarFeedbackRole"
      :event-title="calendarFeedbackEventTitle"
      :case-label="calendarFeedbackCaseLabel"
      :initial-summary="calendarFeedbackInitialSummary"
      :initial-mediator-steps="calendarFeedbackInitialMediatorSteps"
      :initial-party-steps="calendarFeedbackInitialPartySteps"
      :submitting="calendarFeedbackSubmitting"
      @submit="onCalendarMeetingFeedbackSubmit"
    />
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'
import MeetingFeedbackModal from '../../components/MeetingFeedbackModal.vue'
import {
  isPastKadrCaseMeeting,
  clientNeedsMeetingFeedback
} from '../../utils/meetingFeedback'
const KADR_EVENT_COLOR = 'rgb(121, 134, 203)'
const PERSONAL_EVENT_COLOR = 'rgb(244, 81, 30)'

export default {
  name: 'calendar',
  components: { MeetingFeedbackModal },
  data () {
    return {
      selectedAppointment: null,
      events: [],
      calendarFeedbackModalVisible: false,
      calendarFeedbackRole: 'first',
      calendarFeedbackEventId: null,
      calendarFeedbackSubmitting: false
    }
  },
  computed: {
    currentUserId () {
      return this.$store.state.user && this.$store.state.user.id
    },
    calendarSyntheticCase () {
      const sa = this.selectedAppointment
      if (!sa || !sa.caseId) return null
      return {
        id: sa.caseId,
        user_cases_first_partyTouser: sa.first_party ? { id: sa.first_party } : null,
        user_cases_second_partyTouser: sa.second_party ? { id: sa.second_party } : null,
        user_cases_mediatorTouser: sa.mediator ? { id: sa.mediator } : null
      }
    },
    calendarFeedbackHint () {
      if (!this.selectedAppointment || !this.currentUserId) return ''
      const sa = this.selectedAppointment
      const ev = this.calendarEventPayload(sa)
      if (!ev || !isPastKadrCaseMeeting(ev)) return ''
      if (!this.calendarSyntheticCase || !clientNeedsMeetingFeedback(ev, this.currentUserId, this.calendarSyntheticCase)) return ''
      return 'This case meeting has ended. Please rate how the session went.'
    },
    calendarFeedbackEventTitle () {
      return (this.selectedAppointment && this.selectedAppointment.title) || ''
    },
    calendarFeedbackCaseLabel () {
      const sa = this.selectedAppointment
      if (!sa || !sa.caseNumber) return ''
      return `Case #${sa.caseNumber}`
    },
    calendarFeedbackInitialSummary () {
      return this.selectedAppointment && this.selectedAppointment.meeting_summary
    },
    calendarFeedbackInitialMediatorSteps () {
      return this.selectedAppointment && this.selectedAppointment.mediator_next_steps
    },
    calendarFeedbackInitialPartySteps () {
      const sa = this.selectedAppointment
      if (!sa) return ''
      if (this.calendarClientPartyRole === 'first') return sa.first_party_next_steps || ''
      if (this.calendarClientPartyRole === 'second') return sa.second_party_next_steps || ''
      return ''
    },
    calendarClientPartyRole () {
      const sa = this.selectedAppointment
      const uid = this.currentUserId
      if (!sa || !uid) return null
      if (sa.first_party === uid) return 'first'
      if (sa.second_party === uid) return 'second'
      return null
    }
  },
  mounted () {
    sofbox.index()
    this.initCalendar(false)
  },
  methods: {
    calendarEventPayload (sa) {
      if (!sa) return null
      return {
        type: sa.type || 'KADR',
        end_datetime: sa.end instanceof Date ? sa.end.toISOString() : sa.end,
        meeting_summary: sa.meeting_summary,
        mediator_next_steps: sa.mediator_next_steps,
        first_party_rating: sa.first_party_rating,
        second_party_rating: sa.second_party_rating
      }
    },
    async initCalendar (skipCache) {
      this.loading = true
      const response = await this.$store.dispatch('getCalendarInit', { skipCache })
      this.events = []
      if (response.success) {
        for (let i = 0; i < response.data.events.length; i++) {
          const event = response.data.events[i]
          const color = event.type === 'KADR' ? KADR_EVENT_COLOR : PERSONAL_EVENT_COLOR
          this.events.push({
            id: event.id,
            title: event.title,
            start: event.start_datetime,
            end: event.end_datetime,
            color,
            extendedProps: {
              description: event.description || 'No description provided',
              meetingLink: event.meeting_link,
              caseId: event.cases ? event.cases.id : null,
              caseNumber: event.cases ? event.cases.caseId : null,
              type: event.type,
              first_party: event.cases ? event.cases.first_party : null,
              second_party: event.cases ? event.cases.second_party : null,
              mediator: event.cases ? event.cases.mediator : null,
              meeting_summary: event.meeting_summary,
              mediator_next_steps: event.mediator_next_steps,
              first_party_next_steps: event.first_party_next_steps,
              second_party_next_steps: event.second_party_next_steps,
              first_party_rating: event.first_party_rating,
              second_party_rating: event.second_party_rating
            }
          })
        }
      }
      this.loading = false
    },
    formatDateTime (dateString) {
      const date = new Date(dateString)
      const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }
      return new Intl.DateTimeFormat('en-US', options).format(date)
    },
    openDetailsModal (event) {
      const xp = event.extendedProps || {}
      this.selectedAppointment = {
        title: event.title,
        start: event.start,
        end: event.end,
        caseId: xp.caseId,
        type: xp.type,
        id: event.id,
        meetingLink: xp.meetingLink,
        description: xp.description,
        caseNumber: xp.caseNumber,
        first_party: xp.first_party,
        second_party: xp.second_party,
        mediator: xp.mediator,
        meeting_summary: xp.meeting_summary,
        mediator_next_steps: xp.mediator_next_steps,
        first_party_next_steps: xp.first_party_next_steps,
        second_party_next_steps: xp.second_party_next_steps,
        first_party_rating: xp.first_party_rating,
        second_party_rating: xp.second_party_rating
      }
      this.$refs['view-appointment-modal'].show()
    },
    openFeedbackFromCalendar () {
      this.calendarFeedbackRole = this.calendarClientPartyRole || 'first'
      this.calendarFeedbackEventId = this.selectedAppointment && this.selectedAppointment.id
      this.calendarFeedbackModalVisible = true
      this.$bvModal.hide('view-appointment-modal-id')
    },
    async onCalendarMeetingFeedbackSubmit (payload) {
      const id = this.calendarFeedbackEventId || (this.selectedAppointment && this.selectedAppointment.id)
      if (!id) return
      const body = { event_id: id }
      if (payload.role === 'first') {
        body.first_party_rating = payload.rating
        if (payload.party_next_steps) body.first_party_next_steps = payload.party_next_steps
      } else if (payload.role === 'second') {
        body.second_party_rating = payload.rating
        if (payload.party_next_steps) body.second_party_next_steps = payload.party_next_steps
      }
      this.calendarFeedbackSubmitting = true
      const res = await this.$store.dispatch('submitMeetingFeedback', body)
      this.calendarFeedbackSubmitting = false
      if (res.success) {
        this.calendarFeedbackModalVisible = false
        await this.initCalendar(true)
        this.$store.dispatch('getDashboardContent', { force: true })
      }
    }
  }
}
</script>
<style lang="css" scoped>
.data-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #f1f1f1;
  }

  .data-row:last-child {
    border-bottom: none;
  }

  .data-title {
    font-weight: bold;
  }
  .long-description {
    padding: 10px;
  }
  .long-description textarea {
    width: 100%;
    resize: none;
    border: 0;
  }
  .calendar-feedback-prompt {
    margin-top: 1rem;
    padding: 0.85rem;
    border-radius: 8px;
    background: #fff8e6;
    border: 1px solid #f5d78e;
  }
</style>
