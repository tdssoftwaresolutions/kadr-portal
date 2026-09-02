<template>
  <div>
    <component
      v-if="calendarReady && FullCalendarComponent"
      :is="FullCalendarComponent"
      :options="calendarOptions"
    />
    <div v-else class="calendar-loading text-muted py-4 text-center">
      Loading calendar…
    </div>
  </div>
</template>
<script>
function startOfToday () {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export default {
  name: 'FullCalendar',
  props: {
    // eslint-disable-next-line vue/require-valid-default-prop
    calendarEvents: { type: Array, default: [] },
    eventClick: {
      type: Function,
      default: null
    },
    dateClick: {
      type: Function,
      default: null
    },
    /**
     * When true, past calendar days cannot be used to create new events.
     * Past months/days remain navigable so existing events can be reviewed.
     */
    disablePast: {
      type: Boolean,
      default: false
    },
    /** View-only: no drag/select create (clients & admins) */
    readOnly: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      calendarReady: false,
      FullCalendarComponent: null,
      calendarOptions: {
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        initialView: 'dayGridMonth',
        events: this.calendarEvents,
        editable: !this.readOnly,
        selectable: !this.readOnly,
        selectMirror: !this.readOnly,
        dayMaxEvents: true,
        weekends: true,
        select: this.handleDateSelect,
        dateClick: this.handleDateClick,
        eventClick: this.handleEventClick,
        eventsSet: this.handleEvents,
        selectAllow: this.handleSelectAllow,
        eventAllow: this.handleEventAllow
      }
    }
  },
  async created () {
    const [
      fcVue,
      dayGridPlugin,
      timeGridPlugin,
      interactionPlugin,
      listPlugin
    ] = await Promise.all([
      import('@fullcalendar/vue'),
      import('@fullcalendar/daygrid'),
      import('@fullcalendar/timegrid'),
      import('@fullcalendar/interaction'),
      import('@fullcalendar/list')
    ])
    this.FullCalendarComponent = fcVue.default
    this.$set(this.calendarOptions, 'plugins', [
      dayGridPlugin.default,
      timeGridPlugin.default,
      listPlugin.default,
      interactionPlugin.default
    ])
    // Do not set validRange — past dates must remain visible for review
    this.calendarReady = true
  },
  watch: {
    calendarEvents: {
      deep: true,
      handler (next) {
        this.calendarOptions.events = Array.isArray(next) ? [...next] : []
      }
    }
  },
  methods: {
    isBeforeToday (dateLike) {
      if (!dateLike) return false
      const day = dateLike instanceof Date ? new Date(dateLike) : new Date(dateLike)
      if (Number.isNaN(day.getTime())) return false
      day.setHours(0, 0, 0, 0)
      return day < startOfToday()
    },
    handleWeekendsToggle () {
      this.calendarOptions.weekends = !this.calendarOptions.weekends
    },
    emitDatePick (info) {
      if (typeof this.dateClick === 'function') {
        this.dateClick(info)
      }
    },
    /** Block creating/dragging onto past days; today and future are allowed */
    handleSelectAllow (selectInfo) {
      if (this.readOnly) return false
      if (!this.disablePast) return true
      return !this.isBeforeToday(selectInfo.start)
    },
    handleEventAllow (dropInfo) {
      if (this.readOnly) return false
      if (!this.disablePast) return true
      return !this.isBeforeToday(dropInfo.start)
    },
    handleDateSelect (selectInfo) {
      if (this.readOnly) {
        if (selectInfo.view && selectInfo.view.calendar) {
          selectInfo.view.calendar.unselect()
        }
        return
      }
      if (this.disablePast && this.isBeforeToday(selectInfo.start)) {
        if (selectInfo.view && selectInfo.view.calendar) {
          selectInfo.view.calendar.unselect()
        }
        return
      }
      this.emitDatePick(selectInfo)
      if (selectInfo.view && selectInfo.view.calendar) {
        selectInfo.view.calendar.unselect()
      }
    },
    handleDateClick (clickInfo) {
      if (this.readOnly) return
      if (this.disablePast) {
        const day = clickInfo.date instanceof Date
          ? new Date(clickInfo.date)
          : new Date(clickInfo.dateStr)
        if (this.isBeforeToday(day)) return
      }
      this.emitDatePick(clickInfo)
    },
    handleEventClick (clickInfo) {
      if (typeof this.eventClick === 'function') {
        this.eventClick(clickInfo.event)
      }
    },
    handleEvents (events) {
      this.currentEvents = events
    }
  }
}
</script>
