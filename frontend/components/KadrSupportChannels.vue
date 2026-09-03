<template>
  <div class="kadr-support-channels">
    <p class="kadr-support-title">Reach the Kadr team</p>
    <ul class="kadr-support-list">
      <li>
        <strong>Call us</strong>
        <span class="kadr-support-value">{{ phoneDisplay }}</span>
      </li>
      <li>
        <strong>Email us: </strong>
        <a class="kadr-support-link" :href="'mailto:' + emailAddress">{{ emailDisplay }}</a>
      </li>
      <li>
        <strong>Chat with us:</strong>
        <span class="kadr-support-hint">{{ chatHint }}</span>
      </li>
    </ul>
  </div>
</template>

<script>
import { KADR_SUPPORT_PHONE_DISPLAY, KADR_SUPPORT_EMAIL_DISPLAY, KADR_SUPPORT_EMAIL_ADDRESS } from '../constants/kadrSupportContact'

export default {
  name: 'KadrSupportChannels',
  props: {
    /** 'case' = messaging is tied to the open case; 'standalone' = general portal support */
    variant: {
      type: String,
      default: 'case'
    }
  },
  data () {
    return {
      phoneDisplay: KADR_SUPPORT_PHONE_DISPLAY,
      emailDisplay: KADR_SUPPORT_EMAIL_DISPLAY,
      emailAddress: KADR_SUPPORT_EMAIL_ADDRESS
    }
  },
  computed: {
    chatHint () {
      if (this.variant === 'standalone') {
        return 'Use the conversation on this page — messages go to our team (not linked to a case).'
      }
      return 'Use the chat below for this case (messages go to our team).'
    }
  }
}
</script>

<style scoped>
.kadr-support-channels {
  margin-bottom: 0.75rem;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  border: 1px solid #d8e2f8;
  background: linear-gradient(180deg, #f7f9ff, #fff);
}
.kadr-support-title {
  margin: 0 0 0.45rem;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #5c678a;
}
.kadr-support-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.88rem;
  color: #2f3752;
}
.kadr-support-list li {
  margin-bottom: 0.45rem;
}
.kadr-support-list li:last-child {
  margin-bottom: 0;
}
.kadr-support-value {
  display: block;
  margin-top: 0.15rem;
  font-weight: 600;
}
.kadr-support-link {
  display: inline-block;
  margin-top: 0.15rem;
  font-weight: 600;
}
.kadr-support-hint {
  display: block;
  margin-top: 0.15rem;
  color: #5c678a;
  font-size: 0.82rem;
  font-weight: 500;
}
</style>
