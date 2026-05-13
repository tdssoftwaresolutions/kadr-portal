<template>
  <div class="website-thread-panel">
    <div v-if="loadError" class="text-danger small">{{ loadError }}</div>
    <div v-else-if="loading && !messages.length" class="text-muted small py-2">Loading…</div>
    <div v-else class="messages-scroll">
      <article
        v-for="m in messages"
        :key="m.id"
        class="msg-row"
        :class="{ 'msg-own': m.author_type === 'ADMIN' && m.admin && m.admin.id === adminUserId }"
      >
        <div class="msg-bubble">
          <header class="msg-meta">
            <span class="msg-author">{{ formatAuthor(m) }}</span>
            <time class="msg-time">{{ formatTime(m.created_at) }}</time>
          </header>
          <div class="msg-body">{{ m.body }}</div>
        </div>
      </article>
    </div>
    <form class="composer mt-2" @submit.prevent="onSubmit">
      <label class="sr-only" for="website-reply-body">Reply</label>
      <textarea
        id="website-reply-body"
        v-model="draft"
        class="composer-input"
        rows="4"
        maxlength="8000"
        placeholder="Write a reply. This is emailed to the address on file."
        :disabled="sending"
      />
      <div class="composer-actions">
        <button type="submit" class="btn btn-primary" :disabled="sending || !draft.trim()">
          <span v-if="sending" class="spinner-border spinner-border-sm me-2" role="status"></span>
          Send reply
        </button>
      </div>
    </form>
    <div v-if="toast" class="alert alert-info small mt-2 mb-0 py-2">{{ toast }}</div>
  </div>
</template>

<script>

export default {
  name: 'WebsiteInquiryThreadPanel',
  props: {
    threadId: { type: String, required: true },
    adminUserId: { type: String, required: true },
    visitorEmail: { type: String, default: '' },
    threadOrigin: { type: String, default: 'WEBSITE' },
    participantDisplayName: { type: String, default: '' }
  },
  data () {
    return {
      messages: [],
      loading: false,
      loadError: null,
      draft: '',
      sending: false,
      toast: null
    }
  },
  watch: {
    threadId: { immediate: true, handler () { this.load() } }
  },
  methods: {
    formatAuthor (m) {
      if (m.author_type === 'ADMIN') {
        const n = m.admin && m.admin.name ? m.admin.name : 'Admin'
        return `${n}`
      }
      if (m.author_type === 'PORTAL_USER') {
        const n = (this.participantDisplayName || '').trim()
        return n ? `${n}` : 'Portal user'
      }
      if (m.author_type === 'VISITOR') {
        const n = (this.participantDisplayName || this.visitorEmail || '').trim()
        return n ? `${n}` : 'Website visitor'
      }
      return 'Message'
    },
    formatTime (d) {
      if (!d) return ''
      return new Date(d).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    async load () {
      if (!this.threadId) return
      this.loading = true
      this.loadError = null
      const res = await this.$store.dispatch('getAdminWebsiteContactThread', { threadId: this.threadId })
      this.loading = false
      if (res.success && res.data) {
        this.messages = res.data.messages || []
        this.$nextTick(() => {
          const el = this.$el && this.$el.querySelector('.messages-scroll')
          if (el) el.scrollTop = el.scrollHeight
        })
      } else {
        this.loadError = res.message || 'Could not load thread.'
        this.messages = []
      }
    },
    async onSubmit () {
      const body = (this.draft || '').trim()
      if (!body || this.sending) return
      this.sending = true
      this.toast = null
      const res = await this.$store.dispatch('postAdminWebsiteContactReply', {
        threadId: this.threadId,
        body
      })
      this.sending = false
      if (res.success) {
        this.draft = ''
        this.toast = 'Reply sent by email.'
        this.$emit('thread-updated')
        await this.load()
      } else {
        this.toast = res.message || 'Could not send.'
      }
    }
  }
}
</script>

<style scoped>
.messages-scroll {
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid #edf0f7;
  border-radius: 8px;
  padding: 0.5rem;
  background: #fafbff;
}
.msg-row {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 0.5rem;
}
.msg-row.msg-own {
  justify-content: flex-end;
}
.msg-bubble {
  max-width: min(92%, 480px);
  border-radius: 10px;
  padding: 0.5rem 0.65rem;
  background: #f4f6fb;
  border: 1px solid #e2e8f5;
}
.msg-own .msg-bubble {
  background: #e8eeff;
  border-color: #c8d4f8;
}
.msg-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #5c678a;
  margin-bottom: 0.25rem;
}
.msg-author {
  font-weight: 700;
  color: #2f3752;
}
.msg-body {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.9rem;
  line-height: 1.45;
}
.composer-input {
  width: 100%;
  border: 1px solid #d3dbef;
  border-radius: 10px;
  padding: 0.5rem 0.65rem;
  font-size: 0.9rem;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
