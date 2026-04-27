<template>
    <b-container fluid>
      <b-row>
        <b-col lg="3" md="12">
          <iq-card class="iq-profile-card text-center">
            <template v-slot:body>
              <div class="iq-team text-center p-0">
                <img v-if="content.user.profile_picture_url" :src="content.user.profile_picture_url" class="img-fluid mb-3 avatar-120 rounded-circle" alt=""/>
                <img v-else :src="require('../../assets/images/user/1.jpg')" class="img-fluid mb-3 avatar-120 rounded-circle" alt=""/>
                <h4 class="mb-0">Welcome {{ user.name }}</h4>
                <p>{{ user.email }}</p>
              </div>
            </template>
          </iq-card>
        </b-col>
        <b-col lg="4" md="12">
          <iq-card>
            <template v-slot:headerTitle>
              <h4 class="card-title">Today's Schedule</h4>
            </template>
            <template v-slot:body>
              <ul class="m-0 p-0 today-schedule" style="overflow-y: scroll;max-height: 300px;">
                <li class="d-flex align-items-center justify-content-between" v-for="(event, index) in content.todaysEvent" :key="index">
                  <div class="d-flex align-items-center">
                    <div class="schedule-icon">
                      <i class="ri-checkbox-blank-circle-fill" :style="{ color: kadrEventColor }"></i>
                    </div>
                    <div class="schedule-text">
                      <span  style="font-weight: bold">Case #{{ event.caseId }}</span>
                      <span>{{ event.caseFirstPartyName }} vs {{ event.caseSecondPartyName }}</span>
                      <span>
                        {{ formatDate(event.start_datetime) }} to {{ formatDate(event.end_datetime) }}
                      </span>
                    </div>
                  </div>
                  <a v-if="event.meeting_link != ''" :href="event.meeting_link"
                    target="_blank"
                    class="btn btn-primary btn-sm" >
                    Join Meeting
                  </a>
                </li>
              </ul>
            </template>
          </iq-card>
        </b-col>
        <b-col lg="5" md="12">
          <iq-card class="">
            <template v-slot:headerTitle>
              <h4 class="card-title">Notifications</h4>
            </template>
            <template v-slot:body>
              <div v-for="(notification, index) in content.notifications" :key="index">
                <div class="d-flex" >
                  <div class="media-body">
                    <h5 class="mt-0 mb-0"> {{ notification.title }}
                      <small class="text-muted font-size-12" style="font-weight: bold;float: right;">{{formatDateForNotifications(notification.created_at)}}</small>
                    </h5>
                    <p>{{ notification.description }}</p>
                  </div>
                </div>
                <hr>
              </div>
            </template>
          </iq-card>
        </b-col>
      </b-row>
      <client-cases :userid="user.id" :content="content"></client-cases>
    </b-container>
</template>
<script>
import ClientCases from '../User/ClientCases.vue'
const KADR_EVENT_COLOR = 'rgb(121, 134, 203)'

export default {
  name: 'DashboardClient',
  props: {
    user: null,
    content: null
  },
  components: {
    ClientCases
  },
  methods: {
    formatDateForNotifications (dateString) {
      const inputDate = new Date(dateString)
      const now = new Date()

      // Extract year, month, and date values
      const inputYear = inputDate.getFullYear()
      const inputMonth = inputDate.getMonth()
      const inputDay = inputDate.getDate()

      const nowYear = now.getFullYear()
      const nowMonth = now.getMonth()
      const nowDay = now.getDate()

      if (inputYear === nowYear && inputMonth === nowMonth) {
        if (inputDay === nowDay) {
          return 'Today'
        } else if (inputDay === nowDay - 1) {
          return 'Yesterday'
        } else if (inputDay === nowDay + 1) {
          return 'Tomorrow'
        }
      }

      // Format date as "2nd March 2026 at 10 AM"
      const day = inputDate.getDate()
      const month = inputDate.toLocaleString('en-US', { month: 'long' })
      const year = inputDate.getFullYear()
      const formattedDay =
        day +
        (day % 10 === 1 && day !== 11
          ? 'st'
          : day % 10 === 2 && day !== 12
            ? 'nd'
            : day % 10 === 3 && day !== 13
              ? 'rd'
              : 'th')

      const time = inputDate.toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      })

      return `${formattedDay} ${month} ${year} at ${time}`
    },
    formatDate (dateString) {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        hour: 'numeric', // '6 PM'
        minute: 'numeric', // '52'
        hour12: true // 12-hour clock
      })
    }
  },
  data () {
    return {
      kadrEventColor: KADR_EVENT_COLOR
    }
  }
}
</script>
