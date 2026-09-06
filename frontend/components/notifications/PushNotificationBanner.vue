<template>
  <div v-if="visible" class="push-banner" role="region" aria-label="Browser notifications">
    <div class="push-banner__content">
      <i class="ri-notification-3-line push-banner__icon" aria-hidden="true"></i>
      <span class="push-banner__text">
        Want updates delivered straight to your browser? Get notified about case
        changes, meeting reminders and more.
      </span>
    </div>
    <div class="push-banner__actions">
      <button type="button" class="btn btn-sm btn-light push-banner__cta" @click="goToSettings">
        Set up notifications
      </button>
      <button
        type="button"
        class="push-banner__close"
        aria-label="Dismiss"
        @click="dismiss"
      >
        &times;
      </button>
    </div>
  </div>
</template>

<script>
import {
  isWebPushSupported,
  getPermissionState,
  isSubscribed
} from '../../utils/webPush'

const STORAGE_KEY = 'kadr.pushBannerDismissed'

/** Per-user dismissal key so dismissing on one account doesn't hide it on another. */
function dismissalKey (userId) {
  return userId ? `${STORAGE_KEY}.${userId}` : STORAGE_KEY
}

function readDismissed (userId) {
  try {
    return window.localStorage.getItem(dismissalKey(userId)) === '1'
  } catch (e) {
    return false
  }
}

function writeDismissed (userId) {
  try {
    window.localStorage.setItem(dismissalKey(userId), '1')
  } catch (e) {
    /* storage unavailable (private mode); banner just reappears next load */
  }
}

export default {
  name: 'PushNotificationBanner',
  data () {
    return {
      visible: false
    }
  },
  computed: {
    userId () {
      const user = this.$store.getters.user
      return (user && user.id) || null
    }
  },
  async mounted () {
    await this.evaluate()
  },
  methods: {
    async evaluate () {
      // Only invite when push is usable and not already set up, and the user
      // hasn't dismissed the banner or blocked notifications for the site.
      if (!isWebPushSupported()) return
      if (getPermissionState() !== 'default') return // granted or denied: nothing to invite
      if (readDismissed(this.userId)) return

      try {
        if (await isSubscribed()) return
      } catch (e) {
        /* fall through: if we can't tell, still offer the invite */
      }
      this.visible = true
    },
    goToSettings () {
      this.visible = false
      this.$router.push({ name: 'user.notifications' })
    },
    dismiss () {
      this.visible = false
      writeDismissed(this.userId)
    }
  }
}
</script>

<style scoped>
.push-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  background: linear-gradient(120deg, var(--kadr-hero-from), var(--kadr-hero-to));
  color: var(--kadr-text-on-primary);
  border-radius: var(--kadr-radius-lg, 12px);
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 6px 18px rgba(13, 96, 255, 0.18);
}

.push-banner__content {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.push-banner__icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.push-banner__text {
  font-size: 0.9rem;
  line-height: 1.35;
}

.push-banner__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.push-banner__cta {
  font-weight: 600;
  white-space: nowrap;
}

.push-banner__close {
  border: 0;
  background: transparent;
  color: var(--kadr-text-on-primary);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.85;
  padding: 0 0.25rem;
}

.push-banner__close:hover {
  opacity: 1;
}

@media (max-width: 575px) {
  .push-banner {
    align-items: flex-start;
  }
}
</style>
