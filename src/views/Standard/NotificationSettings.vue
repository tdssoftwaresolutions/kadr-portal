<template>
  <b-container fluid class="notification-settings-page">
    <div class="page-head mb-3">
      <h4 class="page-title">Notifications</h4>
      <p class="text-muted mb-0">
        Choose how you'd like to be notified about your account and cases.
      </p>
    </div>
    <b-row>
      <b-col lg="8" xl="6">
        <browser-notifications />
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import BrowserNotifications from '../../components/notifications/BrowserNotifications.vue'

export default {
  name: 'NotificationSettings',
  components: {
    BrowserNotifications
  }
}
</script>

<style scoped>
.notification-settings-page {
  padding-top: 0.5rem;
}

.page-title {
  margin: 0;
  font-weight: 600;
}
</style>
