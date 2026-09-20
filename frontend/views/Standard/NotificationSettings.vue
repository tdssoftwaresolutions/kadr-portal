<template>
  <b-container fluid class="notification-settings-page">
    <div class="page-head mb-3">
      <h4 class="page-title">{{ $t('standardPages.notificationsTitle') }}</h4>
      <p class="text-muted mb-0">
        {{ $t('standardPages.notificationsSubtitle') }}
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
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'NotificationSettings',
  components: {
    BrowserNotifications
  },
  mounted () {
    // Route page (StandardLayout child) — without this, a direct reload or
    // fresh-tab open of this URL leaves StandardLayout's boot #loading
    // overlay stuck forever, since nothing else ever fades it out.
    sofbox.index()
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
