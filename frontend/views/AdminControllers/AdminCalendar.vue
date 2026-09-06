<template>
  <b-container fluid class="kadr-animate-in">
    <b-row>
      <b-col md="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">{{ $t('adminCalendar.allMeetings') }}</h4>
          </template>
          <template v-slot:body>
            <p class="text-muted mb-3">{{ $t('adminCalendar.subtitle') }}</p>
            <FullCalendar :calendarEvents="events" :eventClick="openDetailsModal" :read-only="true" />
          </template>
        </iq-card>
      </b-col>
    </b-row>
    <b-modal id="admin-view-appointment-modal" v-model="showDetailsModal" size="lg" :title="$t('adminCalendar.meetingDetails')" scrollable no-footer>
      <div class="appointment-details" v-if="selectedAppointment != null">
        <div class="data-row">
          <div class="col-6">
            <div class="data-title">{{ $t('adminCalendar.titleLabel') }}</div>
            <div>{{ selectedAppointment.title }}</div>
          </div>
          <div class="col-6">
            <div class="data-title">{{ $t('adminCalendar.meetingLink') }}</div>
            <div v-if="selectedAppointment.meetingLink"><a :href="selectedAppointment.meetingLink" target="_blank" rel="noopener">{{ $t('adminCalendar.join') }}</a></div>
            <div v-else class="text-muted">—</div>
          </div>
        </div>
        <div class="data-row">
          <div class="col-6">
            <div class="data-title">{{ $t('adminCalendar.start') }}</div>
            <div>{{ formatDateTime(selectedAppointment.start) }}</div>
          </div>
          <div class="col-6">
            <div class="data-title">{{ $t('adminCalendar.end') }}</div>
            <div>{{ formatDateTime(selectedAppointment.end) }}</div>
          </div>
        </div>
        <div class="data-row" v-if="selectedAppointment.caseNumber">
          <div class="col-6">
            <div class="data-title">{{ $t('adminCalendar.case') }}</div>
            <div>#{{ selectedAppointment.caseNumber }}</div>
          </div>
        </div>
        <div class="data-row" v-if="selectedAppointment.type">
          <div class="col-6">
            <div class="data-title">{{ $t('adminCalendar.type') }}</div>
            <div>{{ selectedAppointment.type }}</div>
          </div>
        </div>
        <div class="long-description">
          <div class="data-title">{{ $t('adminCalendar.description') }}</div>
          <textarea rows="5" readonly :value="selectedAppointment.description"></textarea>
        </div>
        <b-button class="btn btn-primary mt-3" style="float:right;" @click="showDetailsModal = false">{{ $t('adminCalendar.close') }}</b-button>
      </div>
    </b-modal>
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'

const KADR_EVENT_COLOR = '#5a4bd4'
const PERSONAL_EVENT_COLOR = '#4a8fb0'

export default {
  name: 'AdminCalendar',
  data () {
    return {
      showDetailsModal: false,
      selectedAppointment: null,
      events: []
    }
  },
  mounted () {
    sofbox.index()
    this.initCalendar()
  },
  methods: {
    async initCalendar () {
      const response = await this.$store.dispatch('getCalendarInit', { skipCache: true })
      this.events = []
      if (!response.success) return
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
            description: event.description || this.$t('adminCalendar.noDescription'),
            meetingLink: event.meeting_link,
            caseNumber: event.cases ? event.cases.caseId : null,
            type: event.type
          }
        })
      }
    },
    formatDateTime (dateString) {
      return this.$formatDateTime(dateString)
    },
    openDetailsModal (calEvent) {
      const xp = calEvent.extendedProps || {}
      this.selectedAppointment = {
        title: calEvent.title,
        start: calEvent.start,
        end: calEvent.end,
        meetingLink: xp.meetingLink,
        description: xp.description,
        caseNumber: xp.caseNumber,
        type: xp.type
      }
      this.showDetailsModal = true
    }
  }
}
</script>

<style scoped>
.data-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--kadr-border);
}
.data-row:last-child {
  border-bottom: none;
}
.data-title {
  font-weight: bold;
}
.long-description {
  padding: 10px 0;
}
.long-description textarea {
  width: 100%;
  resize: none;
  border: 0;
}
</style>
