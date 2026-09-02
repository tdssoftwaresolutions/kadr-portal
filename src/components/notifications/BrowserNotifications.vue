<template>
  <iq-card>
    <template v-slot:headerTitle>
      <h5 class="card-title mb-0">Browser notifications</h5>
    </template>
    <template v-slot:body>
      <p class="text-muted small mb-3">
        Get desktop notifications in this browser for the events you care about.
        You control which updates are pushed below.
      </p>

      <b-alert :show="!supported" variant="warning" class="small">
        This browser does not support push notifications. Try the latest Chrome, Edge, or Firefox.
      </b-alert>

      <b-alert :show="supported && permission === 'denied'" variant="warning" class="small">
        Notifications are blocked in your browser settings for this site. Enable them in the
        browser’s site permissions, then reload this page.
      </b-alert>

      <template v-if="supported">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <div>
            <strong>Push to this browser</strong>
            <div class="small text-muted">
              <span v-if="enabled" class="text-success">Enabled on this device</span>
              <span v-else>Not enabled on this device</span>
            </div>
          </div>
          <b-button
            :variant="enabled ? 'outline-danger' : 'primary'"
            size="sm"
            :disabled="busy || permission === 'denied'"
            @click="toggleSubscription"
          >
            {{ busy ? 'Working…' : (enabled ? 'Turn off' : 'Enable notifications') }}
          </b-button>
        </div>

        <hr />

        <div class="d-flex align-items-center justify-content-between mb-2">
          <strong class="small">Notify me about</strong>
          <b-form-checkbox v-model="preferences.push_enabled" switch @change="persistPreferences">
            All push
          </b-form-checkbox>
        </div>

        <b-form-group class="mb-0">
          <b-form-checkbox
            v-for="cat in visibleCategories"
            :key="cat.key"
            v-model="preferences[cat.key]"
            :disabled="!preferences.push_enabled"
            class="mb-2"
            @change="persistPreferences"
          >
            {{ cat.label }}
            <div class="small text-muted">{{ cat.hint }}</div>
          </b-form-checkbox>
        </b-form-group>
      </template>
    </template>
  </iq-card>
</template>

<script>
import {
  isWebPushSupported,
  getPermissionState,
  isSubscribed,
  subscribe,
  unsubscribe
} from '../../utils/webPush'

// Category metadata. `roles` limits which portal users see a category; an empty
// roles array means it is shown to everyone.
const CATEGORY_META = [
  { key: 'meeting_reminders', label: 'Upcoming meetings', hint: 'Reminders before scheduled mediation meetings.', roles: [] },
  { key: 'case_updates', label: 'Case updates', hint: 'Status changes and progress on your cases.', roles: [] },
  { key: 'case_assignment', label: 'New case assignment', hint: 'When a case is assigned to you.', roles: ['MEDIATOR', 'ADMIN'] },
  { key: 'admin_approvals', label: 'Approvals', hint: 'User and case approvals in the admin panel.', roles: ['ADMIN'] },
  { key: 'admin_support', label: 'Support tickets', hint: 'New messages on support tickets.', roles: ['ADMIN'] },
  { key: 'admin_case', label: 'Admin case activity', hint: 'Case-related activity across the platform.', roles: ['ADMIN'] }
]

export default {
  name: 'BrowserNotifications',
  data () {
    return {
      supported: false,
      permission: 'default',
      enabled: false,
      busy: false,
      preferences: {
        push_enabled: true,
        meeting_reminders: true,
        case_updates: true,
        case_assignment: true,
        admin_approvals: true,
        admin_support: true,
        admin_case: true
      }
    }
  },
  computed: {
    userType () {
      const user = this.$store.getters.user
      return String((user && (user.user_type || user.type)) || '').toUpperCase()
    },
    visibleCategories () {
      return CATEGORY_META.filter(
        (c) => !c.roles.length || c.roles.includes(this.userType)
      )
    }
  },
  async mounted () {
    this.supported = isWebPushSupported()
    if (this.supported) {
      this.permission = getPermissionState()
      try {
        this.enabled = await isSubscribed()
      } catch (e) {
        this.enabled = false
      }
    }
    await this.loadPreferences()
  },
  methods: {
    async loadPreferences () {
      const res = await this.$store.dispatch('getPushPreferences')
      if (res && res.success && res.data && res.data.preferences) {
        this.preferences = { ...this.preferences, ...res.data.preferences }
      }
    },
    async persistPreferences () {
      // Defer one tick so v-model updates land before we read them.
      await this.$nextTick()
      await this.$store.dispatch('savePushPreferences', { ...this.preferences })
    },
    async toggleSubscription () {
      this.busy = true
      try {
        if (this.enabled) {
          await unsubscribe()
          this.enabled = false
        } else {
          await subscribe()
          this.enabled = true
          this.permission = getPermissionState()
        }
      } catch (err) {
        this.$store.dispatch('alert/showAlert', {
          message: err.message || 'Could not update notifications',
          type: 'danger'
        }, { root: true })
        this.permission = getPermissionState()
      } finally {
        this.busy = false
      }
    }
  }
}
</script>
