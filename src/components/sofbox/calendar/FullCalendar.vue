<template>
  <VueFullCalendar :options='calendarOptions'
  />
</template>
<script>
import VueFullCalendar from '@fullcalendar/vue'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
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
    }
  },
  data () {
    return {
      calendarOptions: {
        plugins: [
          dayGridPlugin,
          timeGridPlugin,
          listPlugin,
          interactionPlugin // needed for dateClick
        ],
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        initialView: 'dayGridMonth',
        events: this.calendarEvents, // alternatively, use the `events` setting to fetch from a feed
        editable: true,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        weekends: true,
        select: this.handleDateSelect,
        eventClick: this.handleEventClick,
        eventsSet: this.handleEvents
        /* you can update a remote database when these fire:
        eventAdd:
        eventChange:
        eventRemove:
        */
      }
    }
  },
  components: {
    VueFullCalendar // make the <VueFullCalendar> tag available
  },
  mounted () {
  },
  watch: {
    calendarEvents: {
      deep: true,
      handler (next) {
        this.calendarOptions.events = Array.isArray(next) ? [...next] : []
      }
    }
  },
  computed: {

  },
  methods: {
    handleWeekendsToggle () {
      this.calendarOptions.weekends = !this.calendarOptions.weekends // update a property
    },
    handleDateSelect (selectInfo) {
      this.dateClick(selectInfo)
    },
    handleEventClick (clickInfo) {
      this.eventClick(clickInfo.event)
    },
    handleEvents (events) {
      this.currentEvents = events
    }
  }
}
</script>
