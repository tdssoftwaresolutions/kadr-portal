<template>
  <div v-if="visible" class="kadr-support-fab" :class="{ 'is-open': open }">
    <transition name="kadr-support-fab-fade">
      <div v-if="open" class="kadr-support-fab-panel" role="dialog" aria-label="Kadr support">
        <header class="kadr-support-fab-panel-head">
          <h6>Kadr support</h6>
          <button type="button" class="kadr-support-fab-close" aria-label="Close" @click="open = false">
            <i class="ri-close-line"></i>
          </button>
        </header>
        <ul class="kadr-support-fab-list">
          <li>
            <span class="kadr-support-fab-label">Call us</span>
            <a class="kadr-support-fab-value" :href="'tel:' + phoneTel">{{ phoneDisplay }}</a>
          </li>
          <li>
            <span class="kadr-support-fab-label">Email us</span>
            <a class="kadr-support-fab-value" :href="'mailto:' + emailAddress">{{ emailDisplay }}</a>
          </li>
        </ul>
        <button type="button" class="btn btn-primary btn-block kadr-support-fab-chat" @click="goToNewChat">
          <i class="ri-chat-3-line"></i>
          Start a chat
        </button>
      </div>
    </transition>
    <button
      type="button"
      class="kadr-support-fab-trigger"
      :class="{ active: open }"
      :aria-expanded="open ? 'true' : 'false'"
      aria-label="Open Kadr support"
      @click="toggle"
    >
      <i :class="open ? 'ri-close-line' : 'ri-customer-service-2-line'"></i>
    </button>
  </div>
</template>

<script>
import {
  KADR_SUPPORT_PHONE_DISPLAY,
  KADR_SUPPORT_EMAIL_DISPLAY,
  KADR_SUPPORT_EMAIL_ADDRESS
} from '../constants/kadrSupportContact'

export default {
  name: 'KadrSupportFab',
  props: {
    userType: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      open: false,
      phoneDisplay: KADR_SUPPORT_PHONE_DISPLAY,
      emailDisplay: KADR_SUPPORT_EMAIL_DISPLAY,
      emailAddress: KADR_SUPPORT_EMAIL_ADDRESS
    }
  },
  computed: {
    visible () {
      const t = (this.userType || '').toUpperCase()
      return t === 'CLIENT' || t === 'MEDIATOR'
    },
    phoneTel () {
      return String(this.phoneDisplay || '').replace(/\s+/g, '')
    },
    onSupportPage () {
      return this.$route && this.$route.name === 'app.support'
    }
  },
  watch: {
    $route () {
      this.open = false
    }
  },
  methods: {
    toggle () {
      this.open = !this.open
    },
    goToNewChat () {
      this.open = false
      if (this.onSupportPage) {
        this.$router.replace({ name: 'app.support', query: { compose: '1' } }).catch(() => {})
        return
      }
      this.$router.push({ name: 'app.support', query: { compose: '1' } }).catch(() => {})
    }
  }
}
</script>

<style scoped>
.kadr-support-fab {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 1040;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.kadr-support-fab-panel {
  width: min(320px, calc(100vw - 2rem));
  border-radius: 14px;
  border: 1px solid #d8e2f8;
  background: #fff;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.18);
  padding: 1rem 1rem 1.1rem;
}

.kadr-support-fab-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.kadr-support-fab-panel-head h6 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #1f2a37;
}

.kadr-support-fab-close {
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0;
  cursor: pointer;
}

.kadr-support-fab-list {
  list-style: none;
  margin: 0 0 0.85rem;
  padding: 0;
}

.kadr-support-fab-list li {
  margin-bottom: 0.65rem;
}

.kadr-support-fab-list li:last-child {
  margin-bottom: 0;
}

.kadr-support-fab-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
  margin-bottom: 0.15rem;
}

.kadr-support-fab-value {
  font-size: 0.92rem;
  font-weight: 600;
  color: #0084ff;
  text-decoration: none;
  word-break: break-word;
}

.kadr-support-fab-value:hover {
  text-decoration: underline;
}

.kadr-support-fab-chat {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-weight: 600;
}

.kadr-support-fab-trigger {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #0084ff 0%, #2b4ecf 100%);
  color: #fff;
  font-size: 1.45rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 132, 255, 0.45);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kadr-support-fab-trigger:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(0, 132, 255, 0.5);
}

.kadr-support-fab-trigger.active {
  background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
  box-shadow: 0 8px 20px rgba(31, 41, 55, 0.35);
}

.kadr-support-fab-fade-enter-active,
.kadr-support-fab-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.kadr-support-fab-fade-enter,
.kadr-support-fab-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 575px) {
  .kadr-support-fab {
    right: 0.85rem;
    bottom: 0.85rem;
  }
}
</style>
