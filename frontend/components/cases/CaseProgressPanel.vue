<template>
  <div class="case-progress-panel">
    <section v-if="now && isPastView" class="case-progress-now case-progress-closure" :class="`case-progress-now--${now.tone || 'info'}`">
      <div class="case-progress-now-head">
        <span class="case-progress-now-icon">
          <i :class="nowIcon"></i>
        </span>
        <div>
          <h6 class="case-progress-now-title">{{ now.headline }}</h6>
          <p class="case-progress-now-desc">{{ now.description }}</p>
        </div>
      </div>
    </section>

    <section v-else-if="now" class="case-progress-now" :class="`case-progress-now--${now.tone || 'info'}`">
      <div class="case-progress-now-head">
        <span class="case-progress-now-icon">
          <i :class="nowIcon"></i>
        </span>
        <div>
          <h6 class="case-progress-now-title">{{ now.headline }}</h6>
          <p class="case-progress-now-desc">{{ now.description }}</p>
          <p v-if="now.waitingOn" class="case-progress-waiting">
            <i class="ri-time-line"></i>
            Waiting on {{ waitingOnLabel }}
          </p>
        </div>
      </div>
      <div v-if="now.actionKey || now.meetingLink" class="case-progress-now-actions">
        <button
          v-if="now.actionKey"
          type="button"
          class="btn btn-sm btn-primary"
          @click="$emit('action', now.actionKey)"
        >
          {{ now.actionLabel }}
        </button>
        <a
          v-if="now.meetingLink"
          :href="now.meetingLink"
          target="_blank"
          rel="noopener"
          class="btn btn-sm btn-outline-primary"
        >
          Join meeting
        </a>
      </div>
    </section>

    <section class="case-progress-phases">
      <div class="case-progress-section-head">
        <h6>Progress</h6>
        <small>{{ humanStatus }}</small>
      </div>
      <div class="case-progress-rail">
        <div
          v-for="phase in phases"
          :key="phase.id"
          class="case-progress-phase"
          :class="`case-progress-phase--${phase.state}`"
        >
          <span class="case-progress-phase-dot">
            <i v-if="phase.state === 'done'" class="ri-check-line"></i>
            <i v-else :class="phase.icon"></i>
          </span>
          <span class="case-progress-phase-label">{{ phase.label }}</span>
        </div>
      </div>
    </section>

    <section v-if="upcomingSteps.length && !isPastView" class="case-progress-upcoming">
      <div class="case-progress-section-head">
        <h6>Coming up</h6>
      </div>
      <ul class="case-progress-upcoming-list">
        <li v-for="(step, idx) in upcomingSteps" :key="`up-${idx}`">
          <strong>{{ step.title }}</strong>
          <span v-if="step.description" class="d-block text-muted small">{{ step.description }}</span>
        </li>
      </ul>
    </section>

    <section class="case-progress-activity">
      <div class="case-progress-section-head">
        <h6>Activity</h6>
        <small>Recent updates on this case</small>
      </div>
      <div v-if="!activity.length" class="case-progress-empty">No activity recorded yet.</div>
      <ul v-else class="case-progress-activity-list">
        <li v-for="item in activity" :key="item.id" class="case-progress-activity-item">
          <span class="case-progress-activity-kind" :class="`kind-${item.kind}`">
            <i :class="activityIcon(item.kind)"></i>
          </span>
          <div class="case-progress-activity-body">
            <strong>{{ item.title }}</strong>
            <span class="case-progress-activity-time">{{ formatDate(item.at) }}</span>
            <p v-if="item.description" class="mb-0 small text-muted">{{ item.description }}</p>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script>
export default {
  name: 'CaseProgressPanel',
  props: {
    progress: {
      type: Object,
      default: null
    },
    isPastView: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    now () {
      return this.progress && this.progress.now
    },
    phases () {
      return (this.progress && this.progress.phases) || []
    },
    activity () {
      return (this.progress && this.progress.activity) || []
    },
    upcomingSteps () {
      return (this.progress && this.progress.upcomingSteps) || []
    },
    humanStatus () {
      return (this.progress && this.progress.humanStatus) || ''
    },
    nowIcon () {
      const tone = this.now && this.now.tone
      if (tone === 'action') return 'ri-flashlight-line'
      if (tone === 'waiting') return 'ri-hourglass-line'
      if (tone === 'success') return 'ri-checkbox-circle-line'
      return 'ri-information-line'
    },
    waitingOnLabel () {
      const w = this.now && this.now.waitingOn
      if (w === 'first_party') return 'the initiating party'
      if (w === 'second_party') return 'the opposite party'
      if (w === 'admin') return 'KADR admin'
      if (w === 'other_party') return 'the other party'
      return 'another participant'
    }
  },
  methods: {
    formatDate (value) {
      return this.$formatDateTime(value)
    },
    activityIcon (kind) {
      const map = {
        payment: 'ri-money-rupee-circle-line',
        meeting: 'ri-calendar-event-line',
        milestone: 'ri-flag-line',
        signature: 'ri-quill-pen-line',
        assignment: 'ri-user-star-line'
      }
      return map[kind] || 'ri-record-circle-line'
    }
  }
}
</script>

<style scoped>
.case-progress-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.case-progress-now {
  border-radius: 14px;
  padding: 1rem 1.1rem;
  border: 1px solid var(--kadr-primary-soft-border);
  background: linear-gradient(135deg, var(--kadr-primary-soft) 0%, var(--kadr-bg-surface) 100%);
}

.case-progress-now--action {
  border-color: var(--kadr-primary-soft-border);
  background: linear-gradient(135deg, var(--kadr-primary-soft) 0%, var(--kadr-surface-info) 100%);
}

.case-progress-now--waiting {
  border-color: var(--kadr-status-warning-bg);
  background: linear-gradient(135deg, var(--kadr-status-warning-bg) 0%, var(--kadr-surface-muted) 100%);
}

.case-progress-now--success {
  border-color: var(--kadr-status-success-bg);
  background: linear-gradient(135deg, var(--kadr-status-success-bg) 0%, var(--kadr-surface-muted) 100%);
}

.case-progress-now--muted {
  border-color: var(--kadr-status-secondary-bg);
  background: linear-gradient(135deg, var(--kadr-status-secondary-bg) 0%, var(--kadr-surface-muted) 100%);
}

.case-progress-now-head {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
}

.case-progress-now-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--kadr-bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--kadr-primary);
  font-size: 1.25rem;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(90, 75, 212, 0.12);
}

.case-progress-now-title {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--kadr-text-primary);
}

.case-progress-now-desc {
  margin: 0;
  font-size: 0.88rem;
  color: var(--kadr-text-secondary);
  line-height: 1.45;
}

.case-progress-waiting {
  margin: 0.5rem 0 0;
  font-size: 0.82rem;
  color: var(--kadr-status-warning-text);
  font-weight: 600;
}

.case-progress-now-actions {
  margin-top: 0.85rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.case-progress-section-head h6 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.case-progress-section-head small {
  color: var(--kadr-text-muted);
}

.case-progress-rail {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0.65rem;
  position: relative;
  padding-left: 4px;
}

.case-progress-rail::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--kadr-border-strong);
}

.case-progress-phase {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0;
  position: relative;
}

.case-progress-phase-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--kadr-surface-muted);
  border: 2px solid var(--kadr-border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  color: var(--kadr-text-label);
  flex-shrink: 0;
  z-index: 1;
}

.case-progress-phase--done .case-progress-phase-dot {
  background: var(--kadr-status-success-bg);
  border-color: var(--kadr-success);
  color: var(--kadr-status-success-text);
}

.case-progress-phase--active .case-progress-phase-dot {
  background: var(--kadr-primary-soft);
  border-color: var(--kadr-primary);
  color: var(--kadr-primary);
  box-shadow: 0 0 0 4px rgba(90, 75, 212, 0.15);
}

.case-progress-phase-label {
  font-size: 0.88rem;
  color: var(--kadr-text-muted);
  font-weight: 500;
}

.case-progress-phase--done .case-progress-phase-label,
.case-progress-phase--active .case-progress-phase-label {
  color: var(--kadr-text-primary);
  font-weight: 600;
}

.case-progress-upcoming-list {
  margin: 0.5rem 0 0;
  padding-left: 1.1rem;
  font-size: 0.88rem;
}

.case-progress-activity-list {
  list-style: none;
  margin: 0.65rem 0 0;
  padding: 0;
  max-height: 320px;
  overflow-y: auto;
}

.case-progress-activity-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--kadr-border-info);
}

.case-progress-activity-item:last-child {
  border-bottom: 0;
}

.case-progress-activity-kind {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--kadr-status-secondary-bg);
  color: var(--kadr-status-secondary-text);
}

.case-progress-activity-kind.kind-payment {
  background: var(--kadr-status-success-bg);
  color: var(--kadr-status-success-text);
}

.case-progress-activity-kind.kind-meeting {
  background: var(--kadr-status-info-bg);
  color: var(--kadr-status-info-text);
}

.case-progress-activity-body {
  flex: 1;
  min-width: 0;
}

.case-progress-activity-body strong {
  display: block;
  font-size: 0.88rem;
  color: var(--kadr-text-primary);
}

.case-progress-activity-time {
  display: block;
  font-size: 0.75rem;
  color: var(--kadr-text-label);
  margin-bottom: 0.15rem;
}

.case-progress-empty {
  font-size: 0.88rem;
  color: var(--kadr-text-label);
  padding: 0.5rem 0;
}

.case-progress-closure {
  margin-bottom: 0.25rem;
}
</style>
