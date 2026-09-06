<template>
  <b-container fluid class="calendar-page kadr-animate-in">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
    <Spinner :isVisible="loading" />

    <kadr-page-header :title="$t('mediatorCalendar.title')" :subtitle="$t('mediatorCalendar.subtitle')">
      <template #actions>
        <button type="button" class="btn btn-primary" @click="openModal">
          <i class="ri-add-line"></i> {{ $t('mediatorCalendar.bookAppointment') }}
        </button>
      </template>
    </kadr-page-header>

    <b-row>
      <b-col md="3">
        <kadr-section-card :title="$t('mediatorCalendar.classification')" class="mb-3">
          <ul class="m-0 p-0 job-classification">
            <li>
              <i class="ri-checkbox-blank-circle-fill" :style="{ color: kadrEventColor }" />
              {{ $t('mediatorCalendar.legendKadr') }}
            </li>
            <li v-if="hasPersonalCalendar">
              <i class="ri-checkbox-blank-circle-fill" :style="{ color: personalEventColor }" />
              {{ $t('mediatorCalendar.legendPersonal') }}
            </li>
          </ul>
        </kadr-section-card>

        <kadr-section-card :title="$t('mediatorCalendar.todaysSchedule')">
          <div v-if="todaysEvents.length" class="list-scroll">
            <div
              v-for="(event, index) in todaysEvents"
              :key="index"
              class="schedule-item"
            >
              <div class="schedule-main">
                <i
                  class="ri-checkbox-blank-circle-fill schedule-dot"
                  :style="{ color: event.type == 'KADR' ? kadrEventColor : personalEventColor }"
                ></i>
                <div class="schedule-text" v-if="event.type == 'KADR'">
                  <h6>{{ $t('mediatorCalendar.caseNumber', { caseNumber: event.caseNumber }) }}</h6>
                  <p>{{ $t('mediatorCalendar.partiesVs', { firstParty: event.firstPartyName, secondParty: event.secondPartyName }) }}</p>
                  <span>{{ $t('mediatorCalendar.timeRange', { startTime: formatTime(event.startDate), endTime: formatTime(event.endDate) }) }}</span>
                </div>
                <div class="schedule-text" v-else>
                  <h6>{{ event.title }}</h6>
                  <span>{{ $t('mediatorCalendar.timeRange', { startTime: formatTime(event.startDate), endTime: formatTime(event.endDate) }) }}</span>
                </div>
              </div>
              <a
                v-if="event.meetingLink"
                :href="event.meetingLink"
                target="_blank"
                class="btn btn-primary btn-sm"
              >
                {{ $t('mediatorCalendar.join') }}
              </a>
            </div>
          </div>
          <kadr-empty-state
            v-else
            compact
            icon=""
            :description="$t('mediatorCalendar.noEventsToday')"
          />
        </kadr-section-card>
      </b-col>
      <b-col md="9">
        <kadr-section-card :title="$t('mediatorCalendar.calendar')">
          <FullCalendar
            :calendarEvents="events"
            :eventClick="openDetailsModal"
            :dateClick="onDateClick"
            :disable-past="true"
          />
        </kadr-section-card>
      </b-col>
    </b-row>
    <b-modal
      id="new-appointment-modal-id"
      v-model="showNewAppointmentModal"
      size="lg"
      :title="bookingPrefillDate ? $t('mediatorCalendar.bookForDate', { date: bookingPrefillDateLabel }) : $t('mediatorCalendar.bookAppointment')"
      @ok="onSave"
      :ok-title="$t('mediatorCalendar.book')"
      scrollable
    >
      <div class="radio-row">
          <div class="data-title">{{ $t('mediatorCalendar.selectAppointmentType') }}</div>
          <div class="radio-group">
            <div class="radio-btn-wrapper" @click="onClickAppointmentType">
              <input type="radio" id="option1" name="group1" value="kadr" v-model="newAppointment.type">
              <label for="option1">
                <i class="ri-checkbox-blank-circle-fill" :style="{ color: kadrEventColor, marginRight: '0.5rem' }"></i> {{ $t('mediatorCalendar.kadrClientMeeting') }}
              </label>
            </div>
            <div v-if="hasPersonalCalendar" class="radio-btn-wrapper" @click="onClickAppointmentType">
              <input type="radio" id="option2" name="group1" value="personal" v-model="newAppointment.type">
              <label for="option2">
                <i class="ri-checkbox-blank-circle-fill" :style="{ color: personalEventColor,marginRight: '0.5rem' }"></i> {{ $t('mediatorCalendar.personalClientMeeting') }}
              </label>
            </div>
          </div>
      </div>
      <div class="data-row" v-if="newAppointment.type == 'personal'">
          <div class="col-12">
              <div class="data-title">{{ $t('mediatorCalendar.titleLabel') }}</div>
              <b-form-input
                id="title"
                type="text"
                v-model="newAppointment.title"
                required
                class="form-control"
              />
          </div>
      </div>
      <div class="data-row" v-if="newAppointment.type == 'personal'">
          <div class="col-12">
              <div class="data-title">{{ $t('mediatorCalendar.descriptionLabel') }}</div>
              <b-form-textarea
                id="textarea"
                v-model="newAppointment.description"
                :placeholder="$t('mediatorCalendar.descriptionPlaceholder')"
                rows="3"
                class="form-control"
                max-rows="6"
              ></b-form-textarea>
          </div>
      </div>
      <div class="data-row" v-else>
        <div class="col-12" v-if="dashboardContent != null">
            <div class="data-title">{{ $t('mediatorCalendar.selectClient') }} <span class="text-danger">*</span></div>
            <div
              class="cases-horizontal-scroll"
              ref="casesHorizontalScroll"
              :class="{ 'cases-horizontal-scroll--error': showCaseRequiredError }"
            >
              <button type="button" @click="scrollLeft" class="scroll-btn left">‹</button>
              <div class="case-card" v-for="(myCase,index) in dashboardContent.myCases.casesWithEvents" :key="myCase.id"
              :class="{ selected: newAppointment.caseId === myCase.id }"
              @click="onClickCase(myCase.id, index)">
                <span  style="font-weight: bold">{{ $t('mediatorCalendar.caseId', { caseId: myCase.caseId }) }}</span>
                <p>{{ $t('mediatorCalendar.partiesVs', { firstParty: myCase.user_cases_first_partyTouser?.name, secondParty: myCase.user_cases_second_partyTouser?.name }) }}</p>
              </div>
              <button type="button" @click="scrollRight" class="scroll-btn right">›</button>
            </div>
            <small v-if="showCaseRequiredError" class="text-danger d-block mt-2">
              {{ $t('mediatorCalendar.caseRequiredError') }}
            </small>
            <small
              v-else-if="!(dashboardContent.myCases && dashboardContent.myCases.casesWithEvents && dashboardContent.myCases.casesWithEvents.length)"
              class="text-muted d-block mt-2"
            >
              {{ $t('mediatorCalendar.noActiveCases') }}
            </small>
        </div>
      </div>
      <div class="data-row">
        <div class="col-12">
          <template v-if="bookingPrefillDate">
            <div class="data-title">{{ $t('mediatorCalendar.dateLabel') }}</div>
            <div class="appointment-locked-date">
              <i class="ri-calendar-check-line" aria-hidden="true"></i>
              <div>
                <strong>{{ bookingPrefillDateLabel }}</strong>
                <small>{{ $t('mediatorCalendar.selectedFromCalendarHint') }}</small>
              </div>
            </div>
            <div class="data-title mt-3">{{ $t('mediatorCalendar.selectTime') }}</div>
            <kadr-date-time-picker
              :key="`time-${bookingPrefillDate}-${timePickerMinKey}`"
              picker-key="time-only"
              mode="time"
              v-model="appointmentTime"
              :min-date="timePickerMinDate"
              :show-timezone-hint="true"
              :placeholder="$t('mediatorCalendar.selectTimePlaceholder')"
              @input="syncStartFromPrefillTime"
            />
          </template>
          <template v-else>
            <div class="data-title">{{ $t('mediatorCalendar.selectDateAndTime') }}</div>
            <kadr-date-time-picker
              key="datetime-full"
              picker-key="datetime-full"
              mode="datetime"
              v-model="newAppointment.start"
              :min-date="bookingMinDate"
              :placeholder="$t('mediatorCalendar.selectDateAndTimePlaceholder')"
            />
          </template>
        </div>
      </div>
    </b-modal>
    <b-modal id="view-appointment-modal-id" cancel-disabled v-model="showDetailsModal" size="lg" :title="$t('mediatorCalendar.viewAppointment')" scrollable no-footer>
      <div class="appointment-details" v-if="selectedAppointment != null">
        <div class="data-row">
            <div class="col-6">
                <div class="data-title">{{ $t('mediatorCalendar.titleLabel') }}</div>
                <div>{{ selectedAppointment.title }}</div>
            </div>
            <div class="col-6">
                <div class="data-title">{{ $t('mediatorCalendar.meetingLink') }}</div>
                <div> <a :href="selectedAppointment.meetingLink" target="_blank">{{ $t('mediatorCalendar.join') }}</a></div>
            </div>
        </div>
        <div class="data-row">
            <div class="col-6">
                <div class="data-title">{{ $t('mediatorCalendar.startTime') }}</div>
                <div>{{ formatDateTime(selectedAppointment.start) }}</div>
            </div>
            <div class="col-6">
                <div class="data-title">{{ $t('mediatorCalendar.endTime') }}</div>
                <div> {{ formatDateTime(selectedAppointment.end) }} </div>
            </div>
        </div>

        <div class="data-row" v-if="selectedAppointment.caseNumber">
            <div class="col-6">
                <div class="data-title">{{ $t('mediatorCalendar.caseIdLabel') }}</div>
                <div>#{{ selectedAppointment.caseNumber }}</div>
            </div>
            <div class="col-6">

            </div>
        </div>
        <div class="long-description">
            <div class="data-title">{{ $t('mediatorCalendar.descriptionLabel') }}</div>
            <textarea rows="5" readonly :value="selectedAppointment.description">
            </textarea>
        </div>
        <div v-if="selectedAppointment && calendarFeedbackHint" class="calendar-feedback-prompt">
          <p class="mb-2">{{ calendarFeedbackHint }}</p>
          <b-button variant="warning" size="sm" @click="openFeedbackFromCalendar">
            {{ calendarFeedbackButtonLabel }}
          </b-button>
        </div>
        <b-button class="btn btn-primary modal-close-btn" @click="showDetailsModal = false">{{ $t('mediatorCalendar.close') }}</b-button>
      </div>
    </b-modal>

    <MeetingFeedbackModal
      v-model="calendarFeedbackModalVisible"
      modal-id="calendar-meeting-feedback-mediator"
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
import Alert from '../../components/sofbox/alert/Alert.vue'
import Spinner from '../../components/sofbox/spinner/spinner.vue'
import { sofbox } from '../../config/pluginInit'
import MeetingFeedbackModal from '../../components/MeetingFeedbackModal.vue'
import KadrPageHeader from '../../components/kadr/KadrPageHeader.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'
import KadrSectionCard from '../../components/kadr/KadrSectionCard.vue'
import KadrDateTimePicker, {
  calendarClickToDateParts,
  formatDisplayDate,
  isCalendarDateBeforeToday,
  startOfLocalDay,
  toYmd
} from '../../components/kadr/KadrDateTimePicker.vue'
import {
  isPastKadrCaseMeeting,
  mediatorNeedsMeetingFeedback,
  clientNeedsMeetingFeedback
} from '../../utils/meetingFeedback'
const PERSONAL_EVENT_COLOR = '#4a8fb0'
const KADR_EVENT_COLOR = '#5a4bd4'

export default {
  name: 'calendar',
  components: {
    KadrDateTimePicker,
    Alert,
    Spinner,
    MeetingFeedbackModal,
    KadrPageHeader,
    KadrEmptyState,
    KadrSectionCard
  },
  data () {
    return {
      loading: false,
      alert: {
        visible: false,
        message: '',
        timeout: 5000,
        type: 'primary'
      },
      dashboardContent: null,
      incrementalId: 1,
      personalEventColor: PERSONAL_EVENT_COLOR,
      kadrEventColor: KADR_EVENT_COLOR,
      showNewAppointmentModal: false,
      showDetailsModal: false,
      selectedAppointment: null,
      /** When set (Y-m-d), booking was opened from a calendar day click — time only */
      bookingPrefillDate: null,
      appointmentTime: '',
      showCaseRequiredError: false,
      newAppointment: {
        title: '',
        start: '',
        caseNumber: '',
        end: '',
        link: '',
        user: '',
        caseId: '',
        type: 'kadr',
        description: ''
      },
      users: [
        { value: null, text: 'Select a case' },
        { value: 'user1', text: '#KDR124975' },
        { value: 'user2', text: '#KDR2193725' },
        { value: 'user3', text: '#KDR389575' }
      ],
      events: [
      ],
      isAuthenticated: false,
      calendarFeedbackModalVisible: false,
      calendarFeedbackRole: 'mediator',
      calendarFeedbackEventId: null,
      calendarFeedbackSubmitting: false
    }
  },
  computed: {
    hasPersonalCalendar () {
      return this.$store.getters.mediatorHasFeature('personal_calendar')
    },
    todaysEvents () {
      return (this.dashboardContent && this.dashboardContent.todaysEvent) || []
    },
    bookingPrefillDateLabel () {
      return formatDisplayDate(this.bookingPrefillDate)
    },
    /**
     * Full date+time booking: allow today onward.
     * Use start-of-day (not "now") so 12h AM/PM hours stay fully selectable.
     */
    bookingMinDate () {
      return startOfLocalDay()
    },
    /**
     * Time-only: on today use midnight as min so AM/PM can cycle freely;
     * future days have no min. Save still rejects times already in the past.
     */
    timePickerMinDate () {
      if (!this.bookingPrefillDate) return startOfLocalDay()
      if (this.bookingPrefillDate === toYmd(new Date())) {
        return startOfLocalDay()
      }
      return null
    },
    timePickerMinKey () {
      return this.bookingPrefillDate || 'any'
    },
    currentUserId () {
      return this.$store.state.currentUser && this.$store.state.currentUser.id
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
      const ut = this.$store.state.currentUser && this.$store.state.currentUser.type
      if (ut === 'MEDIATOR' && sa.mediator === this.currentUserId && mediatorNeedsMeetingFeedback(ev)) {
        return this.$t('mediatorCalendar.feedbackHintMediator')
      }
      if (ut === 'CLIENT' && this.calendarSyntheticCase && clientNeedsMeetingFeedback(ev, this.currentUserId, this.calendarSyntheticCase)) {
        return this.$t('mediatorCalendar.feedbackHintClient')
      }
      return ''
    },
    calendarFeedbackButtonLabel () {
      const ut = this.$store.state.currentUser && this.$store.state.currentUser.type
      return ut === 'MEDIATOR' ? this.$t('mediatorCalendar.addMeetingNotes') : this.$t('mediatorCalendar.rateMeeting')
    },
    calendarFeedbackEventTitle () {
      return (this.selectedAppointment && this.selectedAppointment.title) || ''
    },
    calendarFeedbackCaseLabel () {
      const sa = this.selectedAppointment
      if (!sa || !sa.caseNumber) return ''
      return this.$t('mediatorCalendar.caseNumber', { caseNumber: sa.caseNumber })
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
      const role = this.calendarClientPartyRole
      if (role === 'first') return sa.first_party_next_steps || ''
      if (role === 'second') return sa.second_party_next_steps || ''
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
  async mounted () {
    sofbox.index()
    if (!this.$store.state.mediatorFeatures.length) {
      await this.$store.dispatch('loadMediatorSubscription')
    }
    this.initCalendar(false)
  },
  methods: {
    showAlert (message, type) {
      this.alert = {
        message,
        type,
        visible: true
      }
    },
    onClickCase (id, index) {
      const lCase = this.dashboardContent.myCases.casesWithEvents[index]
      this.newAppointment.title = this.$t('mediatorCalendar.defaultMeetingTitle', { caseId: lCase.caseId })
      this.newAppointment.description = this.$t('mediatorCalendar.defaultMeetingDescription', {
        caseId: lCase.caseId,
        firstParty: lCase.user_cases_first_partyTouser?.name,
        secondParty: lCase.user_cases_second_partyTouser?.name
      })
      this.newAppointment.caseId = id
      this.newAppointment.caseNumber = lCase.caseId
      this.showCaseRequiredError = false
    },
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
      const response = await this.$store.dispatch('getCalendarInit', { skipCache })
      if (response.success) {
        this.events = []
        for (let i = 0; i < response.data.events.length; i++) {
          const event = response.data.events[i]
          this.events.push({
            id: event.id,
            title: event.title,
            start: event.start_datetime,
            end: event.end_datetime,
            color: event.type === 'KADR' ? this.kadrEventColor : this.personalEventColor,
            extendedProps: {
              description: event.description || this.$t('mediatorCalendar.noDescription'),
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
        if (this.dashboardContent == null) {
          const response = await this.$store.dispatch('getDashboardContent')
          if (response.success) {
            this.dashboardContent = JSON.parse(JSON.stringify(response.data.dashboardContent))
          }
        }
      }
    },
    formatTime (dateString) {
      return this.$formatTime(dateString)
    },
    scrollLeft () {
      const container = this.$refs.casesHorizontalScroll
      container.scrollBy({ left: -300, behavior: 'smooth' })
    },
    scrollRight () {
      const container = this.$refs.casesHorizontalScroll
      container.scrollBy({ left: 300, behavior: 'smooth' })
    },
    formatDateTime (dateString) {
      return this.$formatDateTime(dateString)
    },
    closeModal () {
      this.showNewAppointmentModal = false
    },
    closeViewModal () {
      this.showDetailsModal = false
    },
    onSave (bvModalEvt) {
      if (bvModalEvt && typeof bvModalEvt.preventDefault === 'function') {
        bvModalEvt.preventDefault()
      }
      this.showCaseRequiredError = false

      if (this.newAppointment.type === 'personal' && !this.hasPersonalCalendar) {
        this.showAlert(this.$t('mediatorCalendar.personalRequiresPro'), 'warning')
        return
      }

      if (this.newAppointment.type === 'kadr') {
        if (!this.newAppointment.caseId) {
          this.showCaseRequiredError = true
          this.showAlert(this.$t('mediatorCalendar.caseRequiredError'), 'warning')
          return
        }
      } else if (this.newAppointment.type === 'personal') {
        if (!String(this.newAppointment.title || '').trim()) {
          this.showAlert(this.$t('mediatorCalendar.enterMeetingTitle'), 'warning')
          return
        }
        if (!String(this.newAppointment.description || '').trim()) {
          this.showAlert(this.$t('mediatorCalendar.enterMeetingDescription'), 'warning')
          return
        }
      }

      if (!this.newAppointment.start) {
        this.showAlert(this.$t('mediatorCalendar.selectDateTimeAlert'), 'warning')
        return
      }
      const startRaw = String(this.newAppointment.start).includes('T')
        ? String(this.newAppointment.start)
        : String(this.newAppointment.start).replace(' ', 'T')
      const startDate = new Date(startRaw)
      if (Number.isNaN(startDate.getTime()) || startDate.getTime() < Date.now()) {
        this.showAlert(this.$t('mediatorCalendar.chooseFutureTime'), 'warning')
        return
      }
      const endDate = new Date(startDate.getTime())
      endDate.setMinutes(endDate.getMinutes() + 30)
      this.storeNewEvent({
        id: this.incrementalId++,
        title: this.newAppointment.title,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        color: this.newAppointment.type === 'kadr' ? this.kadrEventColor : this.personalEventColor,
        caseId: this.newAppointment.caseId,
        description: this.newAppointment.description,
        type: this.newAppointment.type,
        caseNumber: this.newAppointment.caseNumber
      })
    },
    async storeNewEvent (event) {
      this.loading = true
      let response
      try {
        response = await this.$store.dispatch('newCalendarEvent', { event })
      } finally {
        this.loading = false
      }
      if (response && response.success) {
        this.showAlert(this.$t('mediatorCalendar.bookedSuccess'), 'success')
        event.meetingLink = response.data.meetLink
        const xp = {
          description: event.description || '',
          meetingLink: event.meetingLink,
          caseId: event.caseId || null,
          caseNumber: event.caseNumber || null,
          type: String(event.type || 'kadr').toUpperCase() === 'PERSONAL' ? 'PERSONAL' : 'KADR',
          first_party: null,
          second_party: null,
          mediator: null,
          meeting_summary: null,
          mediator_next_steps: null,
          first_party_next_steps: null,
          second_party_next_steps: null,
          first_party_rating: null,
          second_party_rating: null
        }
        if (this.dashboardContent && event.caseId) {
          const match = this.dashboardContent.myCases.casesWithEvents.find((c) => c.id === event.caseId)
          if (match) {
            xp.first_party = match.first_party || (match.user_cases_first_partyTouser && match.user_cases_first_partyTouser.id)
            xp.second_party = match.second_party || (match.user_cases_second_partyTouser && match.user_cases_second_partyTouser.id)
            xp.mediator = match.mediator || (match.user_cases_mediatorTouser && match.user_cases_mediatorTouser.id)
          }
        }
        this.events.push({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          color: event.color,
          extendedProps: xp
        })
        this.closeModal()
        this.resetForm()
        await this.$store.dispatch('getDashboardContent', { force: true })
      } else if (response && !response.success) {
        this.showAlert(response.message || this.$t('mediatorCalendar.bookFailed'), 'danger')
      }
    },
    openDetailsModal (event) {
      const xp = event.extendedProps || {}
      const endRaw = event.end
      this.selectedAppointment = {
        title: event.title,
        start: event.start,
        end: endRaw,
        link: '',
        user: '',
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
      this.showDetailsModal = true
    },
    openFeedbackFromCalendar () {
      const ut = this.$store.state.currentUser && this.$store.state.currentUser.type
      if (ut === 'MEDIATOR') {
        this.calendarFeedbackRole = 'mediator'
      } else {
        this.calendarFeedbackRole = this.calendarClientPartyRole || 'first'
      }
      this.calendarFeedbackEventId = this.selectedAppointment && this.selectedAppointment.id
      this.calendarFeedbackModalVisible = true
      this.showDetailsModal = false
    },
    async onCalendarMeetingFeedbackSubmit (payload) {
      const id = this.calendarFeedbackEventId || (this.selectedAppointment && this.selectedAppointment.id)
      if (!id) return
      const body = { event_id: id }
      if (payload.role === 'mediator') {
        body.meeting_summary = payload.meeting_summary
        body.mediator_next_steps = payload.mediator_next_steps
      } else if (payload.role === 'first') {
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
    },
    openModal () {
      this.resetForm({ clearPrefill: true })
      this.showNewAppointmentModal = true
    },
    onDateClick (selectedInfo) {
      if (this._openingAppointmentModal) return
      const parts = calendarClickToDateParts(selectedInfo, 10)
      // Past days are view-only (events still open via eventClick); no booking modal
      if (!parts.date || isCalendarDateBeforeToday(parts.date)) {
        return
      }
      this._openingAppointmentModal = true
      this.resetForm({ clearPrefill: true })
      this.bookingPrefillDate = parts.date
      this.appointmentTime = parts.time
      this.syncStartFromPrefillTime()
      this.showNewAppointmentModal = true
      this.$nextTick(() => {
        this._openingAppointmentModal = false
      })
    },
    syncStartFromPrefillTime () {
      if (!this.bookingPrefillDate) return
      const time = this.appointmentTime || '10:00'
      // flatpickr time-only may return "H:i" or a longer string — keep HH:mm (24h)
      const match = String(time).match(/(\d{1,2}):(\d{2})/)
      const normalized = match
        ? `${String(match[1]).padStart(2, '0')}:${match[2]}`
        : '10:00'
      this.appointmentTime = normalized
      this.newAppointment.start = `${this.bookingPrefillDate} ${normalized}`
    },
    onClickAppointmentType () {
      // Keep selected type (v-model) and any date prefill; clear case-specific fields only
      this.newAppointment.title = ''
      this.newAppointment.description = ''
      this.newAppointment.caseId = null
      this.newAppointment.caseNumber = ''
      this.newAppointment.user = ''
      this.showCaseRequiredError = false
    },
    resetForm ({ clearPrefill = true } = {}) {
      if (clearPrefill) {
        this.bookingPrefillDate = null
        this.appointmentTime = ''
      }
      this.showCaseRequiredError = false
      this.newAppointment = {
        title: '',
        start: clearPrefill ? '' : this.newAppointment.start,
        end: '',
        link: '',
        caseNumber: '',
        user: '',
        caseId: null,
        type: 'kadr',
        description: ''
      }
    }
  }
}
</script>
<style scoped>
  /* Modal Overlay */
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

  .long-description textarea {
  width: 100%;
  resize: none;
  border: 0px;
}
  .cases-scroll-container {
  position: relative;
  display: flex;
  align-items: center;
}

.scroll-btn {
  position: absolute;
  top: 58%;
  transform: translateY(-50%);
  display: flex; /* Enable flexbox for centering */
  align-items: center; /* Vertical alignment */
  justify-content: center; /* Horizontal alignment */
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 40px;
  cursor: pointer;
  z-index: 1;
  font-size: 16px; /* Adjust font size if needed */
  line-height: 1; /* Ensures no extra spacing around the text */
}

.scroll-btn.left {
  left: 10px;
}

.scroll-btn.right {
  right: 10px;
}

.scroll-btn:hover {
  background-color: rgba(0, 0, 0, 0.8);
}

  .modal-title {
    font-size: 20px;
    font-weight: bold;
    color: #333;
  }

  .close-button {
    font-size: 24px;
    background: none;
    border: none;
    color: #333;
    cursor: pointer;
    padding: 0;
  }

.long-description {
  padding: 10px;
}

  .cases-horizontal-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 10px;
  border-radius: 8px;
  scroll-behavior: smooth; /* Smooth scrolling for a better experience */
  border: 1px solid transparent;
}

.cases-horizontal-scroll--error {
  border-color: #dc3545;
  background: rgba(220, 53, 69, 0.04);
}

.case-card {
  flex: 0 0 300px; /* Fixed width for each card */
  border: 1px solid #ccc;
  cursor: pointer;
  border-radius: 8px;
  padding: 16px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.case-card:hover {
  transform: scale(1.02);
  box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.2);
}

.case-card.selected {
  border-color: var(--kadr-primary); /* Highlight color */
  background-color: var(--kadr-primary-soft);
  box-shadow: 0 0 10px rgba(90, 75, 212, 0.35);
  transform: scale(1.02); /* Slightly enlarged */
  color: var(--kadr-primary);
}

.case-card h3 {
  margin: 0 0 8px;
  font-size: 18px;
}

.case-card p {
  margin: 4px 0;
  color: #555;
  font-size: 14px;
}

.cases-horizontal-scroll::-webkit-scrollbar {
  height: 8px;
}

.cases-horizontal-scroll::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.cases-horizontal-scroll::-webkit-scrollbar-thumb:hover {
  background: #999;
}
  /* Body */
  .modal-body {
    padding: 10px 0;
    color: #666;
    font-size: 16px;
    line-height: 1.5;
  }

  /* Form Row */
  .row {
    margin-bottom: 20px;
  }

  /* Label */
  .form-label {
    display: block;
    font-weight: 600;
    margin-bottom: 5px;
    color: #444;
    font-size: 16px;
  }

  /* Form Input */
  .form-input {
    width: 100%;
  }

  .form-input:focus {
    border-color: var(--kadr-primary);
    background-color: #fff;
  }

  /* Footer */
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  button {
    padding: 10px 20px;
    font-size: 16px;
    cursor: pointer;
    border: none;
    border-radius: 5px;
  }

  .btn-cancel {
    background-color: #f44336;
    color: white;
  }

  .btn-save {
    background-color: #4CAF50;
    color: white;
  }

  .btn-cancel:hover {
    background-color: #d32f2f;
  }

  .btn-save:hover {
    background-color: #388e3c;
  }

  .radio-group {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
  }

  .radio-btn-wrapper {
    display: flex;
    align-items: center;
    position: relative;
    cursor: pointer;
    font-size: 13px;
  }

  .radio-btn-wrapper input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
  }

  .radio-btn-wrapper label {
    display: flex;
    align-items: center;
    padding: 10px 20px;
    border-radius: 25px;
    background-color: #fff;
    color: #555;
    border: 2px solid #ddd;
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .radio-btn-wrapper input:checked + label {
    color: black;
    border-color: var(--kadr-primary); /* Highlight color */
    background-color: var(--kadr-primary-soft); /* Soft brand background */
    transform: scale(1.02); /* Slightly enlarged */
  }

  .radio-btn-wrapper input:checked + label .radio-dot {
    background-color: #fff;
    transform: scale(1.3);
  }

  .radio-btn-wrapper label .radio-dot {
    display: inline-block;
    width: 16px;
    height: 16px;
    margin-right: 10px;
    border-radius: 50%;
    background-color: #ddd;
    transition: background-color 0.3s ease, transform 0.3s ease;
  }

  .radio-btn-wrapper input:focus + label {
    outline: none;
    border-color: var(--kadr-primary);
  }

  .radio-btn-wrapper:hover label {
    color: black;
    border-color: var(--kadr-primary); /* Highlight color */
    background-color: var(--kadr-primary-soft); /* Soft brand background */
    transform: scale(1.02); /* Slightly enlarged */
  }

  .radio-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .radio-btn-wrapper input:disabled + label {
    background-color: #f5f5f5;
    color: #ccc;
    border-color: #ccc;
    cursor: not-allowed;
  }

  .calendar-feedback-prompt {
    margin-top: 1rem;
    padding: 0.85rem;
    border-radius: var(--kadr-radius);
    background: var(--kadr-status-warning-bg);
    border: 1px solid #f5d78e;
  }

  .job-classification li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    color: var(--kadr-text-primary);
  }

  .modal-close-btn {
    float: right;
    margin-top: 1rem;
  }

  .calendar-page {
    background: var(--kadr-bg-page);
  }

  .appointment-locked-date {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.9rem 1rem;
    border-radius: 12px;
    border: 1px solid var(--kadr-border-info, #ebeffa);
    background: linear-gradient(135deg, #f5f8ff 0%, #eef4ff 100%);
    color: var(--kadr-text-primary, #374948);
  }

  .appointment-locked-date > i {
    font-size: 1.35rem;
    color: var(--kadr-primary, #0084ff);
    margin-top: 0.1rem;
  }

  .appointment-locked-date strong {
    display: block;
    font-size: 1rem;
    font-weight: 650;
    line-height: 1.3;
  }

  .appointment-locked-date small {
    display: block;
    margin-top: 0.15rem;
    font-size: 0.8rem;
    color: var(--kadr-text-muted, #6d7693);
  }
</style>
