<template>
  <b-container fluid class="portal-support-page">
    <b-row>
      <b-col cols="12" md="4" class="mb-3">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title mb-0">{{ $t('standardPages.supportTitle') }}</h4>
          </template>
          <template v-slot:body>
            <KadrSupportChannels variant="standalone" />
            <hr class="my-3">
            <p class="small text-muted mb-2">{{ $t('standardPages.supportConversationsNote') }}</p>
            <b-button variant="outline-primary" size="sm" block class="mb-2" @click="startNew">
              {{ $t('standardPages.newConversation') }}
            </b-button>
            <div v-if="loadingList" class="text-muted small py-2">{{ $t('standardPages.loading') }}</div>
            <div v-else class="support-thread-list">
              <button
                v-for="t in threads"
                :key="t.thread_id"
                type="button"
                class="support-thread-row"
                :class="{ active: selectedId === t.thread_id && mode === 'thread' }"
                @click="openThread(t.thread_id)"
              >
                <div class="font-weight-bold text-break">{{ t.title }}</div>
                <div class="small text-muted text-break">{{ t.last_preview || '—' }}</div>
              </button>
              <p v-if="!threads.length" class="text-muted small mb-0">{{ $t('standardPages.noThreads') }}</p>
            </div>
          </template>
        </iq-card>
      </b-col>
      <b-col cols="12" md="8">
        <iq-card v-if="mode === 'compose'" class="h-100">
          <template v-slot:headerTitle>
            <h4 class="card-title mb-0">{{ $t('standardPages.messageKadrTeam') }}</h4>
          </template>
          <template v-slot:body>
            <b-form-group :label="$t('standardPages.whatIsThisAbout')">
              <b-form-select v-model="newTopic" :options="topicOptions" />
            </b-form-group>
            <b-form-group :label="$t('standardPages.yourMessage')">
              <b-form-textarea v-model="newBody" rows="6" maxlength="8000" :placeholder="$t('standardPages.messagePlaceholder')" />
            </b-form-group>
            <b-button variant="primary" :disabled="sending || !newBody.trim()" @click="submitNew">
              {{ sending ? $t('standardPages.sending') : $t('standardPages.sendMessage') }}
            </b-button>
            <p v-if="newToast" class="small mt-2 mb-0" :class="newToastOk ? 'text-success' : 'text-danger'">{{ newToast }}</p>
          </template>
        </iq-card>
        <iq-card v-if="mode === 'thread' && selectedId" class="h-100">
          <template v-slot:headerTitle>
            <h4 class="card-title mb-0 text-break">{{ activeTitle }}</h4>
          </template>
          <template v-slot:body>
            <div class="messages-scroll-support">
              <article
                v-for="m in messages"
                :key="m.id"
                class="msg-row-support"
                :class="{ 'msg-own-support': m.author_type === 'ADMIN' }"
              >
                <div class="msg-bubble-support">
                  <header class="msg-meta-support">
                    <span class="msg-author-support">{{ formatAuthor(m) }}</span>
                    <time class="msg-time-support">{{ formatTime(m.created_at) }}</time>
                  </header>
                  <div class="msg-body-support">{{ m.body }}</div>
                </div>
              </article>
            </div>
            <b-form-group :label="$t('standardPages.yourReply')" class="mt-3 mb-0">
              <b-form-textarea v-model="replyBody" rows="4" maxlength="8000" />
            </b-form-group>
            <b-button class="mt-2" variant="primary" :disabled="replySending || !replyBody.trim()" @click="sendReply">
              {{ replySending ? $t('standardPages.sending') : $t('standardPages.sendReply') }}
            </b-button>
            <p v-if="replyToast" class="small mt-2 mb-0" :class="replyToastOk ? 'text-success' : 'text-danger'">{{ replyToast }}</p>
          </template>
        </iq-card>
        <iq-card v-else>
          <template v-slot:body>
            <p class="text-muted mb-0">{{ $t('standardPages.pickThreadOrStart') }}</p>
          </template>
        </iq-card>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'
import iqCard from '../../components/sofbox/cards/iq-card.vue'
import KadrSupportChannels from '../../components/KadrSupportChannels.vue'

export default {
  name: 'PortalSupportView',
  components: { iqCard, KadrSupportChannels },
  data () {
    return {
      threads: [],
      loadingList: false,
      mode: 'idle',
      selectedId: null,
      activeTitle: '',
      messages: [],
      loadingThread: false,
      newTopic: 'GENERAL',
      newBody: '',
      sending: false,
      newToast: '',
      newToastOk: false,
      replyBody: '',
      replySending: false,
      replyToast: '',
      replyToastOk: false
    }
  },
  computed: {
    isComposeQuery () {
      return this.isTruthyCompose(this.$route.query.compose)
    },
    topicOptions () {
      return [
        { value: 'GENERAL', text: this.$t('standardPages.topicGeneral') },
        { value: 'PORTAL', text: this.$t('standardPages.topicPortal') },
        { value: 'TECHNICAL', text: this.$t('standardPages.topicTechnical') },
        { value: 'CASE_RELATED', text: this.$t('standardPages.topicCaseRelated') }
      ]
    }
  },
  watch: {
    '$route.query.thread': {
      immediate: true,
      handler (v) {
        if (this.isComposeQuery) return
        if (v && typeof v === 'string' && v.length) {
          this.openThread(v, { skipRouter: true })
        }
      }
    },
    '$route.query.compose': {
      immediate: true,
      handler (v) {
        if (this.isTruthyCompose(v)) {
          this.startNew({ keepComposeQuery: false })
        }
      }
    }
  },
  mounted () {
    sofbox.index()
    this.refreshList()
    if (this.isComposeQuery) {
      this.startNew({ keepComposeQuery: false })
    }
  },
  methods: {
    isTruthyCompose (v) {
      return v === '1' || v === 'true' || v === true
    },
    async refreshList () {
      this.loadingList = true
      const res = await this.$store.dispatch('getPortalSupportThreads')
      this.loadingList = false
      if (res.success && res.data && Array.isArray(res.data.threads)) {
        this.threads = res.data.threads
      } else {
        this.threads = []
      }
    },
    startNew ({ keepComposeQuery = false } = {}) {
      this.mode = 'compose'
      this.selectedId = null
      this.messages = []
      this.newTopic = 'GENERAL'
      this.newBody = ''
      this.newToast = ''
      this.replyToast = ''
      const query = keepComposeQuery ? { compose: '1' } : {}
      this.$router.replace({ name: this.$route.name, query }).catch(() => {})
    },
    async openThread (threadId, { skipRouter = false } = {}) {
      this.selectedId = threadId
      this.mode = 'thread'
      this.replyBody = ''
      this.replyToast = ''
      if (!skipRouter) {
        await this.$router.replace({ name: this.$route.name, query: { thread: String(threadId) } }).catch(() => {})
      }
      this.loadingThread = true
      const res = await this.$store.dispatch('getPortalSupportThread', { threadId })
      this.loadingThread = false
      if (res.success && res.data) {
        this.activeTitle = (res.data.thread && res.data.thread.title) || this.$t('standardPages.support')
        this.messages = res.data.messages || []
        this.$nextTick(() => {
          const el = this.$el && this.$el.querySelector('.messages-scroll-support')
          if (el) el.scrollTop = el.scrollHeight
        })
      } else {
        this.messages = []
        this.replyToast = res.message || this.$t('standardPages.couldNotLoadThread')
        this.replyToastOk = false
      }
    },
    formatAuthor (m) {
      if (m.author_type === 'ADMIN') {
        const n = m.admin && m.admin.name ? m.admin.name : this.$t('standardPages.kadrTeam')
        return this.$t('standardPages.kadrPrefix', { name: n })
      }
      if (m.author_type === 'PORTAL_USER') return this.$t('standardPages.you')
      return this.$t('standardPages.message')
    },
    formatTime (d) {
      return this.$formatDateTime(d)
    },
    async submitNew () {
      const body = (this.newBody || '').trim()
      if (!body || this.sending) return
      this.sending = true
      this.newToast = ''
      try {
        const res = await this.$store.dispatch('createPortalSupportThread', {
          topic: this.newTopic,
          body
        })
        if (res.success && res.data && res.data.threadId) {
          this.newToastOk = true
          this.newToast = this.$t('standardPages.sentTeamWillRespond')
          await this.refreshList()
          await this.openThread(res.data.threadId)
        } else {
          this.newToastOk = false
          this.newToast = res.message || this.$t('standardPages.couldNotSend')
        }
      } catch (e) {
        this.newToastOk = false
        this.newToast = e.message || this.$t('standardPages.couldNotSend')
      } finally {
        this.sending = false
      }
    },
    async sendReply () {
      const body = (this.replyBody || '').trim()
      if (!body || !this.selectedId || this.replySending) return
      this.replySending = true
      this.replyToast = ''
      try {
        const res = await this.$store.dispatch('postPortalSupportUserMessage', {
          threadId: this.selectedId,
          body
        })
        if (res.success) {
          this.replyToastOk = true
          this.replyToast = this.$t('standardPages.messageSent')
          this.replyBody = ''
          await this.refreshList()
          await this.openThread(this.selectedId, { skipRouter: true })
        } else {
          this.replyToastOk = false
          this.replyToast = res.message || this.$t('standardPages.couldNotSend')
        }
      } catch (e) {
        this.replyToastOk = false
        this.replyToast = e.message || this.$t('standardPages.couldNotSend')
      } finally {
        this.replySending = false
      }
    }
  }
}
</script>

<style scoped>
.portal-support-page {
  width: 100%;
  max-width: none;
  background: var(--kadr-bg-page);
}
.support-thread-list {
  max-height: min(420px, 55vh);
  overflow-y: auto;
  border: 1px solid var(--kadr-border);
  border-radius: 8px;
}
.support-thread-row {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid var(--kadr-border-info);
  background: var(--kadr-bg-surface);
  cursor: pointer;
}
.support-thread-row:last-child {
  border-bottom: none;
}
.support-thread-row:hover {
  background: var(--kadr-surface-muted);
}
.support-thread-row.active {
  background: var(--kadr-primary-soft);
}
.messages-scroll-support {
  max-height: min(400px, 50vh);
  overflow-y: auto;
  border: 1px solid var(--kadr-border-info);
  border-radius: 8px;
  padding: 0.5rem;
  background: var(--kadr-surface-info);
}
.msg-row-support {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 0.5rem;
}
.msg-row-support.msg-own-support {
  justify-content: flex-end;
}
.msg-bubble-support {
  max-width: min(92%, 520px);
  border-radius: 10px;
  padding: 0.5rem 0.65rem;
  background: var(--kadr-surface-muted);
  border: 1px solid var(--kadr-border-info);
}
.msg-own-support .msg-bubble-support {
  background: var(--kadr-primary-soft);
  border-color: var(--kadr-primary-soft-border);
}
.msg-meta-support {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--kadr-text-muted);
  margin-bottom: 0.25rem;
}
.msg-author-support {
  font-weight: 700;
  color: var(--kadr-text-primary);
}
.msg-body-support {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.9rem;
  line-height: 1.45;
}
</style>
