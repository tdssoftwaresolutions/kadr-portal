<template>
  <component :is="embedded ? 'div' : 'section'" :class="rootClasses">
    <div class="section-head correspondence-head">
      <div v-if="!(embedded && mode === 'admin' && forcedChannel)" class="correspondence-title-block">
        <h5>
          <i class="fas fa-comments section-icon correspondence-icon"></i>
          {{ panelTitle }}
        </h5>
        <small>{{ panelSubtitle }}</small>
      </div>
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm refresh-chat-btn"
        :disabled="loading"
        title="Load latest messages"
        @click="fetchMessages(true)"
      >
        <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }" aria-hidden="true"></i>
        <span class="refresh-label">Refresh</span>
      </button>
    </div>

    <template v-if="mode === 'admin' && !forcedChannel">
      <div class="channel-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="channel-tab"
          :class="{ active: mediatorChannel === 'ADMIN_MEDIATOR' }"
          :aria-selected="mediatorChannel === 'ADMIN_MEDIATOR'"
          @click="setMediatorChannel('ADMIN_MEDIATOR')"
        >
          Mediator
        </button>
        <button
          type="button"
          role="tab"
          class="channel-tab"
          :class="{ active: mediatorChannel === 'ADMIN_FIRST_PARTY' }"
          :aria-selected="mediatorChannel === 'ADMIN_FIRST_PARTY'"
          @click="setMediatorChannel('ADMIN_FIRST_PARTY')"
        >
          First party
        </button>
        <button
          type="button"
          role="tab"
          class="channel-tab"
          :class="{ active: mediatorChannel === 'ADMIN_SECOND_PARTY' }"
          :aria-selected="mediatorChannel === 'ADMIN_SECOND_PARTY'"
          @click="setMediatorChannel('ADMIN_SECOND_PARTY')"
        >
          Second party
        </button>
      </div>
    </template>

    <div v-if="composerBlockedNotice" class="composer-blocked">
      <i class="fas fa-info-circle" aria-hidden="true"></i>
      {{ composerBlockedNotice }}
    </div>

    <div v-if="loadError" class="correspondence-error">{{ loadError }}</div>

    <div class="messages-scroll" ref="scrollArea">
      <div v-if="loading && !messages.length" class="messages-loading">Loading messages…</div>
      <div v-else-if="!messages.length" class="empty-box correspondence-empty">
        <template v-if="mode === 'admin'">No messages in this thread yet.</template>
        <template v-else>No messages yet. Start the thread when you have an update or a document to share.</template>
      </div>
      <article
        v-for="msg in messages"
        :key="msg.id"
        class="msg-row"
        :class="{ 'msg-own': msg.author && msg.author.id === userId }"
      >
        <div class="msg-bubble">
          <header class="msg-meta">
            <span class="msg-author">{{ formatAuthor(msg) }}</span>
            <time class="msg-time" :datetime="msg.created_at">{{ formatTime(msg.created_at) }}</time>
          </header>
          <p v-if="msg.parent_id" class="msg-reply-hint">Reply in thread</p>
          <div class="msg-body">{{ msg.body }}</div>
          <ul v-if="msg.attachments && msg.attachments.length" class="msg-attachments">
            <li v-for="att in msg.attachments" :key="att.id">
              <a :href="att.s3_url" target="_blank" rel="noopener noreferrer" class="att-link">
                <i class="fas fa-paperclip" aria-hidden="true"></i>
                {{ att.file_name }}
              </a>
            </li>
          </ul>
          <p v-if="msg.had_pii_removed" class="msg-flag">
            <i class="fas fa-cut" aria-hidden="true"></i>
            Contact details were removed from this message.
          </p>
          <button
            v-if="canCompose"
            type="button"
            class="btn btn-link btn-sm reply-btn"
            @click="setReplyTo(msg)"
          >
            Reply
          </button>
        </div>
      </article>
    </div>

    <div v-if="replyTo" class="reply-banner">
      Replying to {{ replyTo.author ? replyTo.author.name : 'message' }}
      <button type="button" class="btn btn-link btn-sm" @click="clearReply">Cancel</button>
    </div>

    <form v-if="canCompose" class="composer" @submit.prevent="onSubmit">
      <label class="sr-only" for="correspondence-body">Message</label>
      <textarea
        id="correspondence-body"
        v-model="draft"
        class="composer-input"
        :rows="textareaRows"
        maxlength="12000"
        placeholder="Write your message. No phone numbers or email addresses."
        :disabled="sending"
      />
      <div class="composer-files">
        <label class="file-pick">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.txt"
            :disabled="sending"
            @change="onFiles"
          >
          <span class="file-pick-label"><i class="fas fa-upload" aria-hidden="true"></i> Attach files</span>
        </label>
        <ul v-if="pendingFiles.length" class="pending-files">
          <li v-for="(f, i) in pendingFiles" :key="i">
            {{ f.name }}
            <button type="button" class="btn-remove-file" @click="removeFile(i)" :disabled="sending">×</button>
          </li>
        </ul>
      </div>
      <div class="composer-actions">
        <button type="submit" class="btn btn-primary" :disabled="sending || !canSend">
          <span v-if="sending" class="spinner-border spinner-border-sm me-2" role="status"></span>
          Send
        </button>
      </div>
    </form>
    <div v-else-if="readOnly" class="muted-footnote">Correspondence is read-only for closed or archived cases.</div>

    <div v-if="toast" class="correspondence-toast" :class="toast.type">{{ toast.text }}</div>
  </component>
</template>

<script>
export default {
  name: 'CaseCorrespondencePanel',
  props: {
    caseId: {
      type: String,
      required: true
    },
    userId: {
      type: String,
      required: true
    },
    userType: {
      type: String,
      required: true
    },
    mode: {
      type: String,
      default: 'client',
      validator: (v) => ['client', 'mediator', 'admin'].includes(v)
    },
    clientChannel: {
      type: String,
      default: null
    },
    hasMediator: {
      type: Boolean,
      default: true
    },
    readOnly: {
      type: Boolean,
      default: false
    },
    embedded: {
      type: Boolean,
      default: false
    },
    variant: {
      type: String,
      default: 'default',
      validator: (v) => ['default', 'sidebar'].includes(v)
    },
    /** When set (admin mode), locks this thread and hides channel tabs (e.g. global inbox). */
    forcedChannel: {
      type: String,
      default: null
    }
  },
  data () {
    return {
      messages: [],
      loading: false,
      sending: false,
      draft: '',
      pendingFiles: [],
      replyTo: null,
      loadError: null,
      mediatorChannel: 'ADMIN_MEDIATOR',
      toast: null
    }
  },
  computed: {
    rootClasses () {
      return {
        'case-correspondence': true,
        'section-card': !this.embedded,
        'case-correspondence--sidebar': this.variant === 'sidebar'
      }
    },
    textareaRows () {
      return this.variant === 'sidebar' ? 3 : 4
    },
    activeChannel () {
      if (this.mode === 'admin' && this.forcedChannel) return this.forcedChannel
      if (this.mode === 'mediator') return 'ADMIN_MEDIATOR'
      if (this.mode === 'admin') return this.mediatorChannel
      return this.clientChannel
    },
    canCompose () {
      if (this.readOnly) return false
      if (!this.activeChannel) return false
      return true
    },
    composerBlockedNotice () {
      if (this.readOnly) return null
      if (!this.activeChannel && this.mode === 'client') return 'Unable to determine your party channel for this case.'
      return null
    },
    canSend () {
      const t = (this.draft || '').trim()
      return t.length > 0 || this.pendingFiles.length > 0
    },
    panelTitle () {
      if (this.mode === 'client' || this.mode === 'mediator') return 'Chat with Kadr team'
      return 'Case messages'
    },
    panelSubtitle () {
      if (this.mode === 'client' || this.mode === 'mediator') {
        return 'Case-related help and general support. Messages go to our team for this case.'
      }
      if (this.mode === 'admin' && this.forcedChannel) return ''
      if (this.mode === 'admin') return 'Switch between mediator and each party’s thread with the team.'
      return ''
    }
  },
  watch: {
    caseId: {
      immediate: true,
      handler () {
        this.fetchMessages()
      }
    },
    activeChannel () {
      this.fetchMessages()
    },
    forcedChannel: {
      immediate: true,
      handler (v) {
        if (this.mode === 'admin' && v) {
          this.mediatorChannel = v
        }
      }
    }
  },
  methods: {
    setMediatorChannel (ch) {
      this.mediatorChannel = ch
      this.clearReply()
    },
    formatAuthor (msg) {
      if (!msg.author) return 'Unknown'
      const own = msg.author.id === this.userId
      if (own) return 'You'

      const t = msg.author.user_type
      if (this.mode === 'client' || this.mode === 'mediator') {
        if (t === 'ADMIN') return `Admin: ${msg.author.name}`
        if (t === 'MEDIATOR') return `Mediator: ${msg.author.name}`
        return msg.author.name
      }
      if (this.mode === 'admin') {
        if (t === 'ADMIN') return `Admin: ${msg.author.name}`
        if (t === 'MEDIATOR') return `Mediator: ${msg.author.name}`
        if (t === 'CLIENT') {
          if (this.forcedChannel === 'ADMIN_FIRST_PARTY') return `First party: ${msg.author.name}`
          if (this.forcedChannel === 'ADMIN_SECOND_PARTY') return `Second party: ${msg.author.name}`
        }
        return msg.author.name
      }
      if (t === 'ADMIN') return `Admin: ${msg.author.name}`
      if (t === 'MEDIATOR') return `Mediator: ${msg.author.name}`
      return msg.author.name
    },
    formatTime (d) {
      return this.$formatDateTime(d)
    },
    setReplyTo (msg) {
      this.replyTo = msg
      this.$nextTick(() => {
        const ta = this.$el.querySelector('#correspondence-body')
        if (ta) ta.focus()
      })
    },
    clearReply () {
      this.replyTo = null
    },
    showToast (text, type = 'info') {
      this.toast = { text, type }
      setTimeout(() => { this.toast = null }, 6000)
    },
    async fetchMessages (fromManualRefresh = false) {
      if (!this.caseId) {
        this.messages = []
        return
      }
      if (this.mode !== 'admin' && !this.activeChannel) {
        this.messages = []
        return
      }
      this.loading = true
      this.loadError = null
      try {
        if (this.mode === 'admin') {
          if (this.forcedChannel) {
            const res = await this.$store.dispatch('getCaseCorrespondence', {
              caseId: this.caseId,
              channel: this.activeChannel
            })
            this.loading = false
            if (res.success) {
              this.messages = res.data.messages || []
              this.$nextTick(this.scrollToBottom)
              if (fromManualRefresh) this.showToast('Latest messages loaded.', 'ok')
            } else {
              this.loadError = res.message || 'Could not load correspondence.'
            }
            return
          }
          const res = await this.$store.dispatch('getAdminCaseCorrespondence', {
            caseId: this.caseId
          })
          this.loading = false
          if (res.success && res.data) {
            const bucket = res.data[this.activeChannel] || []
            this.messages = bucket
            this.$nextTick(this.scrollToBottom)
            if (fromManualRefresh) this.showToast('Latest messages loaded.', 'ok')
          } else {
            this.loadError = res.message || 'Could not load correspondence.'
          }
          return
        }
        const res = await this.$store.dispatch('getCaseCorrespondence', {
          caseId: this.caseId,
          channel: this.activeChannel
        })
        this.loading = false
        if (res.success) {
          this.messages = res.data.messages || []
          this.$nextTick(this.scrollToBottom)
          if (fromManualRefresh) {
            this.showToast('Latest messages loaded.', 'ok')
          }
        } else {
          this.loadError = res.message || 'Could not load correspondence.'
        }
      } catch (e) {
        this.loading = false
        this.loadError = e.message || 'Could not load correspondence.'
      }
    },
    scrollToBottom () {
      const el = this.$refs.scrollArea
      if (el) el.scrollTop = el.scrollHeight
    },
    onFiles (e) {
      const files = Array.from(e.target.files || [])
      const next = this.pendingFiles.concat(files)
      this.pendingFiles = next.slice(0, 5)
      e.target.value = ''
    },
    removeFile (i) {
      this.pendingFiles.splice(i, 1)
    },
    readFileAsDataUrl (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    },
    async onSubmit () {
      if (!this.canSend || this.sending) return
      this.sending = true
      const attachments = []
      for (const f of this.pendingFiles) {
        const base64 = await this.readFileAsDataUrl(f)
        attachments.push({
          fileName: f.name,
          base64,
          mimeType: f.type
        })
      }
      const res = await this.$store.dispatch('postCaseCorrespondence', {
        caseId: this.caseId,
        channel: this.activeChannel,
        body: this.draft,
        parentId: this.replyTo ? this.replyTo.id : null,
        attachments
      })
      this.sending = false
      if (res.success) {
        this.draft = ''
        this.pendingFiles = []
        this.clearReply()
        if (res.data.sanitizationNotice) {
          this.showToast(res.data.sanitizationNotice, 'warn')
        } else {
          this.showToast('Message sent.', 'ok')
        }
        await this.fetchMessages()
      } else {
        this.showToast(res.message || 'Could not send message.', 'err')
      }
    }
  }
}
</script>

<style scoped>
.case-correspondence {
  border: 1px solid #e0e7f4;
  background: linear-gradient(180deg, #fbfcff 0%, #ffffff 48%);
}

.case-correspondence--sidebar {
  border: none;
  background: transparent;
  padding: 0;
}

.case-correspondence--sidebar .messages-scroll {
  max-height: min(280px, 42vh);
}

.case-correspondence--sidebar .correspondence-policy {
  margin: 0.55rem 0 0.65rem;
  padding: 0.55rem 0.65rem;
}

.case-correspondence--sidebar .correspondence-policy p {
  font-size: 0.8rem;
}

.case-correspondence--sidebar .channel-tab {
  padding: 0.32rem 0.65rem;
  font-size: 0.78rem;
}

.case-correspondence--sidebar .msg-bubble {
  max-width: 100%;
}

.correspondence-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.correspondence-title-block h5 {
  margin: 0;
}

.correspondence-head .correspondence-icon {
  color: #3758d5;
}

.refresh-chat-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.refresh-label {
  font-size: 0.8rem;
}

@media (max-width: 420px) {
  .refresh-label {
    display: none;
  }
}

.correspondence-policy {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin: 0.85rem 0 1rem;
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  border: 1px solid #c7d7f5;
  background: #eef3ff;
  color: #2c3a5e;
}

.correspondence-policy p {
  margin: 0.25rem 0 0;
  font-size: 0.88rem;
  line-height: 1.45;
}

.policy-icon {
  color: #3758d5;
  margin-top: 0.15rem;
}

.channel-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
}

.channel-tab {
  border: 1px solid #d8deef;
  background: #f8faff;
  border-radius: 999px;
  padding: 0.45rem 1rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #4a5472;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.channel-tab.active {
  border-color: #3758d5;
  background: #edf2ff;
  color: #243a8f;
}

.composer-blocked {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  background: #fff8e6;
  border: 1px solid #f5d48a;
  color: #6a4a00;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.correspondence-error {
  color: #b02a37;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.messages-scroll {
  max-height: 420px;
  overflow-y: auto;
  padding: 0.35rem 0.15rem 0.75rem;
  border-top: 1px solid #edf0f7;
  border-bottom: 1px solid #edf0f7;
}

.messages-loading {
  padding: 1rem;
  color: #6d7693;
  font-size: 0.9rem;
}

.correspondence-empty {
  margin-top: 0.5rem;
}

.msg-row {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 0.65rem;
}

.msg-row.msg-own {
  justify-content: flex-end;
}

.msg-bubble {
  max-width: min(92%, 520px);
  border-radius: 12px;
  padding: 0.65rem 0.85rem;
  background: #f4f6fb;
  border: 1px solid #e2e8f5;
  box-shadow: 0 1px 2px rgba(20, 30, 70, 0.04);
}

.msg-own .msg-bubble {
  background: linear-gradient(135deg, #e8eeff, #dfe8ff);
  border-color: #c8d4f8;
}

.msg-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.78rem;
  color: #5c678a;
  margin-bottom: 0.35rem;
}

.msg-author {
  font-weight: 700;
  color: #2f3752;
}

.msg-time {
  white-space: nowrap;
}

.msg-reply-hint {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #7a849e;
  margin: 0 0 0.25rem;
}

.msg-body {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.92rem;
  line-height: 1.5;
  color: #1f2538;
}

.msg-attachments {
  list-style: none;
  padding: 0.4rem 0 0;
  margin: 0.35rem 0 0;
}

.msg-attachments li {
  margin-bottom: 0.25rem;
}

.att-link {
  font-size: 0.86rem;
  font-weight: 600;
  color: #3758d5;
}

.msg-flag {
  margin: 0.45rem 0 0;
  font-size: 0.78rem;
  color: #8a5a00;
}

.reply-btn {
  padding-left: 0;
  margin-top: 0.25rem;
}

.reply-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.65rem;
  padding: 0.45rem 0.65rem;
  background: #f0f4ff;
  border-radius: 8px;
  font-size: 0.88rem;
  color: #2f4b9c;
}

.composer {
  margin-top: 0.85rem;
}

.composer-input {
  width: 100%;
  border: 1px solid #d3dbef;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  font-size: 0.92rem;
  resize: vertical;
  min-height: 96px;
}

.composer-files {
  margin-top: 0.55rem;
}

.file-pick input {
  position: absolute;
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  z-index: -1;
}

.file-pick {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.file-pick-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #3758d5;
  border: 1px dashed #b8c4e8;
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  background: #fafbff;
}

.pending-files {
  list-style: none;
  padding: 0.35rem 0 0;
  margin: 0;
  font-size: 0.85rem;
  color: #4a5472;
}

.pending-files li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.2rem 0;
}

.btn-remove-file {
  border: none;
  background: transparent;
  color: #b02a37;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}

.composer-actions {
  margin-top: 0.65rem;
  display: flex;
  justify-content: flex-end;
}

.muted-footnote {
  margin-top: 0.75rem;
  font-size: 0.86rem;
  color: #6d7693;
}

.correspondence-toast {
  margin-top: 0.65rem;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  font-size: 0.88rem;
}

.correspondence-toast.ok {
  background: #dff7e8;
  color: #115f31;
  border: 1px solid #b6e2c6;
}

.correspondence-toast.warn {
  background: #fff8e6;
  color: #6a4a00;
  border: 1px solid #f5d48a;
}

.correspondence-toast.err {
  background: #fde2e4;
  color: #842029;
  border: 1px solid #f1aeb5;
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
