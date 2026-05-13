<template>
  <b-container fluid>
    <b-row>
      <b-col md="12">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">All meetings</h4>
          </template>
          <template v-slot:body>
            <p class="text-muted mb-3">Every case and personal meeting across the platform. Today’s sessions are highlighted in the calendar.</p>
            <FullCalendar :calendarEvents="events" :eventClick="openDetailsModal" />
          </template>
        </iq-card>
      </b-col>
    </b-row>
    <b-modal id="admin-view-appointment-modal" ref="view-appointment-modal" size="lg" title="Meeting details" scrollable hide-footer>
      <div class="appointment-details" v-if="selectedAppointment != null">
        <div class="data-row">
          <div class="col-6">
            <div class="data-title">Title</div>
            <div>{{ selectedAppointment.title }}</div>
          </div>
          <div class="col-6">
            <div class="data-title">Meeting link</div>
            <div v-if="selectedAppointment.meetingLink"><a :href="selectedAppointment.meetingLink" target="_blank" rel="noopener">Join</a></div>
            <div v-else class="text-muted">—</div>
          </div>
        </div>
        <div class="data-row">
          <div class="col-6">
            <div class="data-title">Start</div>
            <div>{{ formatDateTime(selectedAppointment.start) }}</div>
          </div>
          <div class="col-6">
            <div class="data-title">End</div>
            <div>{{ formatDateTime(selectedAppointment.end) }}</div>
          </div>
        </div>
        <div class="data-row" v-if="selectedAppointment.caseNumber">
          <div class="col-6">
            <div class="data-title">Case</div>
            <div>#{{ selectedAppointment.caseNumber }}</div>
          </div>
        </div>
        <div class="data-row" v-if="selectedAppointment.type">
          <div class="col-6">
            <div class="data-title">Type</div>
            <div>{{ selectedAppointment.type }}</div>
          </div>
        </div>
        <div class="long-description">
          <div class="data-title">Description</div>
          <textarea rows="5" readonly :value="selectedAppointment.description"></textarea>
        </div>
        <b-button class="btn btn-primary mt-3" style="float:right;background: #0084ff;" @click="$bvModal.hide('admin-view-appointment-modal')">Close</b-button>
      </div>
    </b-modal>
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'

const KADR_EVENT_COLOR = 'rgb(121, 134, 203)'
const PERSONAL_EVENT_COLOR = 'rgb(244, 81, 30)'

export default {
  name: 'AdminCalendar',
  data () {
    return {
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
            description: event.description || 'No description provided',
            meetingLink: event.meeting_link,
            caseNumber: event.cases ? event.cases.caseId : null,
            type: event.type
          }
        })
      }
    },
    formatDateTime (dateString) {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date)
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
      this.$refs['view-appointment-modal'].show()
    }
  }
}
</script>

<style scoped>
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
  padding: 10px 0;
}
.long-description textarea {
  width: 100%;
  resize: none;
  border: 0;
}
</style>
