<template>
  <b-modal
    :id="modalId"
    v-model="localVisible"
    :title="titleText"
    scrollable
    @hidden="$emit('close')"
  >
    <p v-if="subtitle" class="text-muted small mb-3">{{ subtitle }}</p>

    <template v-if="role === 'mediator'">
      <div class="form-group">
        <label class="font-weight-bold">Meeting summary</label>
        <b-form-textarea v-model="form.meeting_summary" rows="4" placeholder="Brief summary of what was discussed" />
      </div>
      <div class="form-group">
        <label class="font-weight-bold">Next steps (mediator)</label>
        <b-form-textarea v-model="form.mediator_next_steps" rows="3" placeholder="Agreed or recommended next steps" />
      </div>
    </template>

    <template v-else>
      <div class="form-group">
        <label class="font-weight-bold">How was the meeting?</label>
        <div class="star-row">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            class="star-btn"
            :class="{ active: form.rating >= n }"
            :aria-label="`${n} star${n > 1 ? 's' : ''}`"
            @click="form.rating = n"
          >
            <i class="ri-star-fill"></i>
          </button>
        </div>
        <small class="text-muted">1 = poor, 5 = excellent</small>
      </div>
      <div class="form-group">
        <label class="font-weight-bold">Any comments (optional)</label>
        <b-form-textarea v-model="form.party_next_steps" rows="2" placeholder="Share your comments, if anything" />
      </div>
    </template>

    <template #modal-footer>
      <b-button variant="secondary" @click="localVisible = false">Cancel</b-button>
      <b-button variant="primary" :disabled="!canSubmit || submitting" @click="onSubmit">
        <span v-if="submitting" class="spinner-border spinner-border-sm mr-1" role="status" />
        Save
      </b-button>
    </template>
  </b-modal>
</template>

<script>
export default {
  name: 'MeetingFeedbackModal',
  props: {
    value: {
      type: Boolean,
      default: false
    },
    modalId: {
      type: String,
      default: 'meeting-feedback-modal'
    },
    role: {
      type: String,
      required: true,
      validator: (v) => ['mediator', 'first', 'second'].includes(v)
    },
    eventTitle: {
      type: String,
      default: ''
    },
    caseLabel: {
      type: String,
      default: ''
    },
    initialSummary: {
      type: String,
      default: ''
    },
    initialMediatorSteps: {
      type: String,
      default: ''
    },
    initialPartySteps: {
      type: String,
      default: ''
    },
    submitting: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      localVisible: this.value,
      form: {
        meeting_summary: '',
        mediator_next_steps: '',
        rating: 0,
        party_next_steps: ''
      }
    }
  },
  computed: {
    titleText () {
      if (this.role === 'mediator') return 'Post-meeting notes'
      return 'Rate this meeting'
    },
    subtitle () {
      const parts = [this.eventTitle, this.caseLabel].filter(Boolean)
      return parts.join(' · ')
    },
    canSubmit () {
      if (this.role === 'mediator') {
        return (
          String(this.form.meeting_summary || '').trim().length > 0 &&
          String(this.form.mediator_next_steps || '').trim().length > 0
        )
      }
      return this.form.rating >= 1 && this.form.rating <= 5
    }
  },
  watch: {
    value (v) {
      this.localVisible = v
      if (v) this.resetFromProps()
    },
    localVisible (v) {
      this.$emit('input', v)
    }
  },
  methods: {
    resetFromProps () {
      this.form = {
        meeting_summary: this.initialSummary || '',
        mediator_next_steps: this.initialMediatorSteps || '',
        rating: 0,
        party_next_steps: this.initialPartySteps || ''
      }
    },
    onSubmit () {
      if (!this.canSubmit) return
      const payload = { role: this.role }
      if (this.role === 'mediator') {
        payload.meeting_summary = String(this.form.meeting_summary).trim()
        payload.mediator_next_steps = String(this.form.mediator_next_steps).trim()
      } else {
        payload.rating = this.form.rating
        const steps = String(this.form.party_next_steps || '').trim()
        if (steps) payload.party_next_steps = steps
      }
      this.$emit('submit', payload)
    }
  }
}
</script>

<style scoped>
.star-row {
  display: flex;
  gap: 0.35rem;
  margin: 0.25rem 0 0.35rem;
}
.star-btn {
  border: none;
  background: transparent;
  font-size: 1.75rem;
  line-height: 1;
  color: #c5cad8;
  padding: 0.15rem;
  cursor: pointer;
  transition: color 0.15s ease, transform 0.12s ease;
}
.star-btn:hover {
  color: #f0b429;
  transform: scale(1.06);
}
.star-btn.active {
  color: #f5a623;
}
</style>
