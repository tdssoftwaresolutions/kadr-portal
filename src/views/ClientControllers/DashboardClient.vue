<template>
  <b-container fluid class="dashboard-client-page">
    <div class="hero-card">
      <div class="hero-profile">
        <img
          v-if="content.user && content.user.profile_picture_url"
          :src="content.user.profile_picture_url"
          class="hero-avatar"
          alt="Profile picture"
        >
        <img
          v-else
          :src="require('../../assets/images/user/1.jpg')"
          class="hero-avatar"
          alt="Profile picture"
        >
        <div class="hero-user-meta">
          <h3>Welcome back, {{ user.name }}</h3>
          <p>{{ user.email }}</p>
        </div>
      </div>

      <div class="hero-stats">
        <div class="stat-card">
          <span class="stat-label">Ongoing Cases</span>
          <span class="stat-value">{{ myCases.length }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Meetings Today</span>
          <span class="stat-value">{{ todaysEvents.length }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Notifications</span>
          <span class="stat-value">{{ notifications.length }}</span>
        </div>
      </div>
    </div>

    <div class="workspace-grid">
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
          <div v-else class="empty-data">No meetings scheduled for today.</div>
        </template>
      </iq-card>

      <iq-card class="workspace-card notifications-card">
        <template v-slot:headerTitle>
          <h4 class="card-title">Notifications</h4>
        </template>
        <template v-slot:body>
          <div v-if="notifications.length" class="list-scroll">
            <div
              v-for="(notification, index) in notifications"
              :key="index"
              class="notification-item"
            >
              <div class="notification-head">
                <h6>{{ notification.title }}</h6>
                <small>{{ formatDateForNotifications(notification.created_at) }}</small>
              </div>
              <p>{{ notification.description }}</p>
            </div>
          </div>
          <div v-else class="empty-data">No notifications right now.</div>
        </template>
      </iq-card>
    </div>

    <client-cases :userid="user.id" :content="content" @refresh-dashboard="$emit('refresh-dashboard')"></client-cases>
  </b-container>
</template>
<script>
import ClientCases from './ClientCases.vue'
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
  computed: {
    myCases () {
      return this.content.myCases || []
    },
    todaysEvents () {
      return this.content.todaysEvent || []
    },
    notifications () {
      return this.content.notifications || []
    }
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
<style scoped>
.dashboard-client-page {
  background: #f4f6fb;
}

.hero-card {
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  background: linear-gradient(120deg, #2b4ecf 0%, #5e7df7 100%);
  color: #fff;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.hero-profile {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.hero-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.35);
  object-fit: cover;
}

.hero-user-meta h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: bold;
  color:white;
  font-size: 20px;
}

.hero-user-meta p {
  margin: 0.25rem 0 0;
  opacity: 0.9;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(140px, 1fr));
  gap: 0.75rem;
  width: 100%;
  max-width: 460px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.78rem;
  opacity: 0.88;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.workspace-card {
  border-radius: 14px;
}

.list-scroll {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.schedule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem;
  border: 1px solid #ebedf5;
  border-radius: 10px;
  margin-bottom: 0.7rem;
}

.schedule-main {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
}

.schedule-dot {
  margin-top: 0.2rem;
}

.schedule-text h6 {
  margin: 0;
  font-weight: 600;
}

.schedule-text p {
  margin: 0.15rem 0;
  color: #4a5472;
}

.schedule-text span {
  color: #6f7894;
  font-size: 0.86rem;
}

.notification-item {
  padding: 0.85rem;
  border: 1px solid #ebedf5;
  border-radius: 10px;
  margin-bottom: 0.7rem;
}

.notification-head {
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
}

.notification-head h6 {
  margin: 0;
  font-weight: 600;
}

.notification-head small {
  color: #6f7894;
  font-weight: 600;
}

.notification-item p {
  margin: 0.4rem 0 0;
  color: #4a5472;
}

.empty-data {
  text-align: center;
  color: #7c86a7;
  padding: 1.4rem 0.6rem;
  border: 1px dashed #d8dded;
  border-radius: 10px;
}

@media (max-width: 991px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .hero-stats {
    max-width: none;
  }
}

@media (max-width: 575px) {
  .dashboard-client-page {
    padding: 0.5rem;
  }

  .hero-card {
    padding: 1rem;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }
}
</style>
