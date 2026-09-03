<template>
  <b-container fluid class="admin-notifications-page">
    <kadr-page-header :title="$t('adminNotifications.title')" :subtitle="$t('adminNotifications.subtitle')" />

    <b-tabs v-model="activeTab" content-class="mt-3">
      <b-tab :title="$t('adminNotifications.tabBrowser')">
        <b-row>
          <b-col lg="6">
            <browser-notifications />
          </b-col>
        </b-row>
      </b-tab>

      <b-tab :title="$t('adminNotifications.tabTemplates')">
        <b-row class="mb-3 align-items-end">
          <b-col md="4">
            <b-form-group :label="$t('adminNotifications.channel')" label-size="sm" class="mb-0">
              <b-form-select v-model="filterChannel" :options="channelFilterOptions" size="sm" @change="loadTemplates" />
            </b-form-group>
          </b-col>
          <b-col class="text-end">
            <b-button size="sm" variant="primary" @click="openTemplateEditor()">{{ $t('adminNotifications.newTemplate') }}</b-button>
          </b-col>
        </b-row>

        <b-table :items="filteredTemplatesForTable" :fields="templateFields" small responsive>
          <template #cell(channel)="row">
            <b-badge variant="info">{{ row.item.channel }}</b-badge>
          </template>
          <template #cell(active)="row">
            <b-badge :variant="row.item.active ? 'success' : 'secondary'">{{ row.item.active ? $t('adminNotifications.on') : $t('adminNotifications.off') }}</b-badge>
          </template>
          <template #cell(actions)="row">
            <b-button size="sm" variant="outline-primary" class="me-1" @click="openTemplateEditor(row.item)">{{ $t('adminNotifications.edit') }}</b-button>
            <b-button size="sm" variant="outline-danger" @click="removeTemplate(row.item)">{{ $t('adminNotifications.delete') }}</b-button>
          </template>
        </b-table>
      </b-tab>

      <b-tab :title="$t('adminNotifications.tabSend')">
        <iq-card>
          <template v-slot:body>
            <b-form @submit.prevent="sendBulk">
              <b-row>
                <b-col md="4">
                  <b-form-group :label="$t('adminNotifications.channel')" label-size="sm">
                    <b-form-select v-model="sendForm.channel" :options="channelOptions" required @change="onSendChannelChange" />
                  </b-form-group>
                </b-col>
                <b-col md="4">
                  <b-form-group :label="$t('adminNotifications.template')" label-size="sm">
                    <b-form-select
                      v-model="sendForm.templateKey"
                      :options="templateSelectOptions"
                      :disabled="!templateSelectOptions.length"
                      required
                      @change="onSendTemplateChange"
                    >
                      <template #first>
                        <b-form-select-option :value="''" disabled>{{ $t('adminNotifications.selectTemplate') }}</b-form-select-option>
                      </template>
                    </b-form-select>
                    <p v-if="selectedSendTemplate" class="small text-muted mb-0 mt-1">
                      {{ $t('adminNotifications.key') }}: <code>{{ selectedSendTemplate.template_key }}</code>
                    </p>
                  </b-form-group>
                </b-col>
              </b-row>

              <b-form-group :label="$t('adminNotifications.searchRecipients')" label-size="sm">
                <b-form-input v-model="userSearch" :placeholder="$t('adminNotifications.searchRecipientsPlaceholder')" @input="debouncedUserSearch" />
              </b-form-group>

              <b-form-group :label="$t('adminNotifications.selectedRecipients')" label-size="sm">
                <b-form-select v-model="sendForm.userIds" :options="userSelectOptions" multiple :select-size="6" required />
                <p class="small text-muted mt-1 mb-0">{{ $t('adminNotifications.holdToSelect') }}</p>
              </b-form-group>

              <h6 class="mt-3">{{ $t('adminNotifications.templateVariables') }}</h6>
              <p class="small text-muted mb-2">
                <code>{name}</code>, <code>{email}</code>, <code>{phone_number}</code>
              </p>
              <p v-if="!sendForm.templateKey" class="small text-warning">{{ $t('adminNotifications.selectTemplateToLoadVars') }}</p>
              <p v-else-if="!sendForm.variableRows.length" class="small text-muted">{{ $t('adminNotifications.noExtraVars') }}</p>
              <b-row v-for="(v, idx) in sendForm.variableRows" :key="'var-' + idx" class="mb-2 align-items-center">
                <b-col md="4">
                  <code class="small">{{ '{' + v.key + '}' }}</code>
                </b-col>
                <b-col md="8">
                  <b-form-input
                    v-model="v.value"
                    :placeholder="$t('adminNotifications.valueFor', { key: v.key })"
                    size="sm"
                    @input="schedulePreview"
                  />
                </b-col>
              </b-row>

              <div class="d-flex flex-wrap mt-2">
                <b-button type="submit" variant="primary" size="sm" :disabled="sending || !sendForm.templateKey">
                  {{ sending ? $t('adminNotifications.sending') : $t('adminNotifications.sendToSelected') }}
                </b-button>
              </div>
            </b-form>

            <div v-if="sendForm.templateKey" class="mt-3 border rounded p-3 bg-white preview-panel">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="small text-muted mb-0">{{ $t('adminNotifications.livePreview') }}</h6>
                <span v-if="previewLoading" class="small text-muted">{{ $t('adminNotifications.updating') }}</span>
              </div>
              <div v-if="previewSubject"><strong>{{ $t('adminNotifications.subject') }}:</strong> {{ previewSubject }}</div>
              <div v-if="sendForm.channel === 'PUSH' && previewTitle"><strong>{{ $t('adminNotifications.titleField') }}:</strong> {{ previewTitle }}</div>
              <div v-if="previewFullHtml" v-html="previewFullHtml" class="preview-html small" />
              <div v-else-if="previewHtml" v-html="previewHtml" class="preview-html small" />
              <pre v-if="previewText" class="small mt-2 mb-0">{{ previewText }}</pre>
            </div>
          </template>
        </iq-card>
      </b-tab>

      <b-tab :title="$t('adminNotifications.tabChannels')">
        <b-row>
          <b-col lg="6" class="mb-4">
            <iq-card>
              <template v-slot:headerTitle>
                <h5 class="card-title mb-0">{{ $t('adminNotifications.channelConfiguration') }}</h5>
              </template>
              <template v-slot:body>
                <div v-for="ch in channelSettings" :key="ch.channel" class="mb-3 pb-3 border-bottom">
                  <div class="d-flex justify-content-between align-items-center">
                    <strong>{{ ch.channel }}</strong>
                    <b-form-checkbox v-model="ch.enabled" switch @change="saveChannel(ch)">{{ $t('adminNotifications.enabled') }}</b-form-checkbox>
                  </div>
                  <p class="small text-muted mb-2">{{ $t('adminNotifications.provider') }}: {{ ch.provider }}</p>
                  <template v-if="ch.channel === 'EMAIL'">
                    <b-tabs v-model="emailLayoutTab" small class="mb-2">
                      <b-tab :title="$t('adminNotifications.editHtml')">
                        <b-form-group :label="$t('adminNotifications.headerHtml')" label-size="sm" class="mt-2">
                          <html-code-editor
                            ref="emailHeaderHtmlEditor"
                            :value="ch.headerHtml"
                            :rows="6"
                            :visible="channelsTabActive && emailLayoutTab === 0"
                            @input="(val) => onEmailLayoutFieldInput(ch, 'headerHtml', val)"
                          />
                        </b-form-group>
                        <b-form-group :label="$t('adminNotifications.footerHtml')" label-size="sm">
                          <html-code-editor
                            ref="emailFooterHtmlEditor"
                            :value="ch.footerHtml"
                            :rows="6"
                            :visible="channelsTabActive && emailLayoutTab === 0"
                            @input="(val) => onEmailLayoutFieldInput(ch, 'footerHtml', val)"
                          />
                        </b-form-group>
                      </b-tab>
                      <b-tab :title="$t('adminNotifications.preview')">
                        <div class="mt-2 border rounded p-2 bg-white">
                          <div v-if="layoutPreviewHtml" v-html="layoutPreviewHtml" class="preview-html small" />
                          <p v-else class="small text-muted mb-0">{{ $t('adminNotifications.adjustToPreview') }}</p>
                        </div>
                      </b-tab>
                    </b-tabs>
                    <b-button size="sm" variant="primary" @click="saveChannel(ch)">{{ $t('adminNotifications.saveEmailLayout') }}</b-button>
                  </template>
                  <template v-else>
                    <b-form-group :label="$t('adminNotifications.channelConfigJson')" label-size="sm">
                      <b-form-textarea v-model="ch.configJson" rows="2" size="sm" class="font-monospace small" />
                    </b-form-group>
                    <b-button size="sm" variant="outline-primary" @click="saveChannel(ch)">{{ $t('adminNotifications.save') }}</b-button>
                  </template>
                </div>
              </template>
            </iq-card>
          </b-col>
          <b-col lg="6">
            <iq-card>
              <template v-slot:headerTitle>
                <h5 class="card-title mb-0">{{ $t('adminNotifications.recentSendLog') }}</h5>
              </template>
              <template v-slot:body>
                <b-table :items="sendLogs" :fields="logFields" small responsive class="mb-0">
                  <template #cell(status)="row">
                    <b-badge :variant="row.item.status === 'sent' ? 'success' : row.item.status === 'failed' ? 'danger' : 'secondary'">
                      {{ row.item.status }}
                    </b-badge>
                  </template>
                </b-table>
              </template>
            </iq-card>
          </b-col>
        </b-row>
      </b-tab>
    </b-tabs>

    <b-modal v-model="templateModal" size="lg" :title="templateEditor.id ? $t('adminNotifications.editTemplate') : $t('adminNotifications.newTemplate')" scrollable @shown="onTemplateModalShown" @hidden="resetTemplateEditor">
      <b-form @submit.prevent="saveTemplate">
        <b-row>
          <b-col md="6">
            <b-form-group :label="$t('adminNotifications.displayName')" label-size="sm">
              <b-form-input v-model="templateEditor.name" required @input="onTemplateNameInput" />
            </b-form-group>
          </b-col>
          <b-col md="6">
            <b-form-group :label="$t('adminNotifications.channel')" label-size="sm">
              <b-form-select
                v-model="templateEditor.channel"
                :options="channelOptions"
                :disabled="!!templateEditor.id"
                required
                @change="onTemplateEditorChannelChange"
              />
            </b-form-group>
          </b-col>
        </b-row>
        <b-form-group :label="$t('adminNotifications.templateKeyAuto')" label-size="sm">
          <b-form-input v-model="templateEditor.template_key" readonly class="font-monospace small bg-white" />
        </b-form-group>
        <b-form-group :label="$t('adminNotifications.description')" label-size="sm">
          <b-form-input v-model="templateEditor.description" />
        </b-form-group>
        <b-form-checkbox v-model="templateEditor.active" switch class="mb-3">{{ $t('adminNotifications.active') }}</b-form-checkbox>

        <b-form-group v-if="templateEditor.channel === 'EMAIL'" :label="$t('adminNotifications.subject')" label-size="sm">
          <b-form-input v-model="templateEditor.subject" @input="scheduleEditorPreview" />
        </b-form-group>
        <b-form-group v-if="templateEditor.channel === 'EMAIL'" :label="$t('adminNotifications.greetingOptional')" label-size="sm">
          <b-form-input
            v-model="templateEditor.greeting"
            :placeholder="$t('adminNotifications.greetingPlaceholder')"
            @input="scheduleEditorPreview"
          />
        </b-form-group>
        <b-form-group v-if="templateEditor.channel === 'PUSH'" :label="$t('adminNotifications.pushTitle')" label-size="sm">
          <b-form-input v-model="templateEditor.title" @input="scheduleEditorPreview" />
        </b-form-group>

        <b-form-group
          v-if="templateEditor.channel === 'EMAIL'"
          :label="$t('adminNotifications.body')"
          label-size="sm"
        >
          <p v-if="isBuilderTemplate" class="small text-info mb-2">
            {{ $t('adminNotifications.builderNote') }}
          </p>
          <b-tabs v-model="templateBodyTab" small class="mb-0">
            <b-tab :title="$t('adminNotifications.editHtml')">
              <html-code-editor
                ref="templateBodyHtmlEditor"
                v-model="templateEditor.body_html"
                class="mt-2"
                :rows="10"
                :visible="templateModal && templateBodyTab === 0"
                :disabled="isBuilderTemplate"
                :placeholder="isBuilderTemplate ? $t('adminNotifications.bodyGeneratedPlaceholder') : $t('adminNotifications.usePlaceholders')"
                @input="scheduleEditorPreview"
              />
            </b-tab>
            <b-tab :title="$t('adminNotifications.preview')">
              <div class="mt-2 border rounded p-2 bg-white template-body-preview">
                <div v-if="editorPreviewLoading" class="small text-muted mb-2">{{ $t('adminNotifications.updatingPreview') }}</div>
                <div v-if="editorPreviewSubject" class="small mb-2"><strong>{{ $t('adminNotifications.subject') }}:</strong> {{ editorPreviewSubject }}</div>
                <div v-if="editorPreviewFullHtml" v-html="editorPreviewFullHtml" class="preview-html small" />
                <p v-else-if="!editorPreviewLoading" class="small text-muted mb-0">
                  {{ $t('adminNotifications.switchToPreview') }}
                </p>
              </div>
            </b-tab>
          </b-tabs>
        </b-form-group>
        <b-form-group
          v-else
          :label="$t('adminNotifications.messageBody')"
          label-size="sm"
        >
          <b-tabs v-model="templateBodyTab" small class="mb-0">
            <b-tab :title="$t('adminNotifications.editTab')">
              <b-form-textarea
                v-model="templateEditor.body_text"
                rows="6"
                class="mt-2"
                @input="scheduleEditorPreview"
              />
            </b-tab>
            <b-tab :title="$t('adminNotifications.preview')">
              <div class="mt-2 border rounded p-2 bg-white template-body-preview">
                <div v-if="editorPreviewLoading" class="small text-muted mb-2">{{ $t('adminNotifications.updatingPreview') }}</div>
                <pre v-if="editorPreviewText" class="small mb-0 bg-white">{{ editorPreviewText }}</pre>
                <p v-else-if="!editorPreviewLoading" class="small text-muted mb-0">{{ $t('adminNotifications.editBodyToPreview') }}</p>
              </div>
            </b-tab>
          </b-tabs>
        </b-form-group>

        <div v-if="editorPreviewVariableRows.length" class="mt-3">
          <h6 class="small text-muted mb-2">{{ $t('adminNotifications.previewSampleValues') }}</h6>
          <b-row v-for="(v, idx) in editorPreviewVariableRows" :key="'epv-' + idx" class="mb-2 align-items-center">
            <b-col md="4">
              <code class="small">{{ '{' + v.key + '}' }}</code>
            </b-col>
            <b-col md="8">
              <b-form-input v-model="v.value" size="sm" @input="scheduleEditorPreview" />
            </b-col>
          </b-row>
        </div>

        <p class="small text-muted mb-0 mt-2">
          {{ $t('adminNotifications.detectedVariables', { vars: detectedVars.length ? detectedVars.join(', ') : $t('adminNotifications.noneYet') }) }}
        </p>
      </b-form>
      <template #footer>
        <b-button variant="secondary" @click="templateModal = false">{{ $t('adminNotifications.cancel') }}</b-button>
        <b-button variant="primary" :disabled="savingTemplate" @click="saveTemplate">{{ savingTemplate ? $t('adminNotifications.saving') : $t('adminNotifications.save') }}</b-button>
      </template>
    </b-modal>

  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'
import HtmlCodeEditor from '../../components/admin/HtmlCodeEditor.vue'
import KadrPageHeader from '../../components/kadr/KadrPageHeader.vue'
import BrowserNotifications from '../../components/notifications/BrowserNotifications.vue'
import { formatDateTime } from '../../utils/dateFormat'

const CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH']
const AUTO_USER_VARS = new Set(['name', 'email', 'phone_number', 'recipientName'])
const BUILDER_TEMPLATE_KEYS = new Set(['dailyDigest'])
const PREVIEW_SAMPLE_DEFAULTS = {
  name: 'Alex Kumar',
  recipientName: 'Alex Kumar',
  email: 'alex@example.com',
  phone_number: '+91 98765 43210',
  caseId: 'CASE-1001',
  firstPartyName: 'Priya Sharma',
  messagePreview: 'Sample message preview text',
  reason: 'Sample reason'
}

function titleToCamelCase (title) {
  const words = String(title || '')
    .trim()
    .replace(/[^a-zA-Z0-9\s_-]/g, ' ')
    .split(/[\s_-]+/)
    .filter(Boolean)
  if (!words.length) return ''
  return words
    .map((w, i) => {
      const lower = w.toLowerCase()
      if (i === 0) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join('')
}

function emptyTemplateEditor () {
  return {
    id: null,
    template_key: '',
    channel: 'EMAIL',
    name: '',
    description: '',
    subject: '',
    title: '',
    greeting: '',
    body_html: '',
    body_text: '',
    active: true
  }
}

export default {
  name: 'AdminNotificationsView',
  components: {
    HtmlCodeEditor,
    KadrPageHeader,
    BrowserNotifications
  },
  data () {
    return {
      activeTab: 0,
      filterChannel: '',
      templates: [],
      channelSettings: [],
      sendLogs: [],
      emailLayoutTab: 0,
      templateBodyTab: 0,
      layoutPreviewHtml: '',
      layoutPreviewTimer: null,
      editorPreviewFullHtml: '',
      editorPreviewText: '',
      editorPreviewSubject: '',
      editorPreviewLoading: false,
      editorPreviewTimer: null,
      editorPreviewVariableRows: [],
      channels: CHANNELS,
      templateModal: false,
      savingTemplate: false,
      sending: false,
      templateEditor: emptyTemplateEditor(),
      userSearch: '',
      userOptions: [],
      searchTimer: null,
      sendForm: {
        channel: 'EMAIL',
        templateKey: '',
        userTypes: ['CLIENT', 'MEDIATOR', 'ADMIN'],
        userIds: [],
        variableRows: []
      },
      previewHtml: '',
      previewFullHtml: '',
      previewText: '',
      previewSubject: '',
      previewTitle: '',
      previewLoading: false,
      previewTimer: null
    }
  },
  computed: {
    templateFields () {
      return [
        { key: 'name', label: this.$t('adminNotifications.colName') },
        { key: 'template_key', label: this.$t('adminNotifications.key') },
        { key: 'channel', label: this.$t('adminNotifications.channel') },
        { key: 'active', label: this.$t('adminNotifications.colStatus') },
        { key: 'actions', label: '' }
      ]
    },
    logFields () {
      return [
        { key: 'created_at', label: this.$t('adminNotifications.logWhen'), formatter: (v) => (v ? formatDateTime(v) : '') },
        { key: 'template_key', label: this.$t('adminNotifications.template') },
        { key: 'channel', label: this.$t('adminNotifications.channel') },
        { key: 'recipient', label: this.$t('adminNotifications.logTo') },
        { key: 'status', label: this.$t('adminNotifications.colStatus') }
      ]
    },
    userTypeOptions () {
      return [
        { text: this.$t('adminNotifications.clients'), value: 'CLIENT' },
        { text: this.$t('adminNotifications.mediators'), value: 'MEDIATOR' },
        { text: this.$t('adminNotifications.admins'), value: 'ADMIN' }
      ]
    },
    // "Channels & logs" is the 4th tab (index 3) after the browser-notifications tab.
    channelsTabActive () {
      return this.activeTab === 3
    },
    channelOptions () {
      return CHANNELS.map((c) => ({ value: c, text: c }))
    },
    channelFilterOptions () {
      return [{ value: '', text: this.$t('adminNotifications.allChannels') }, ...this.channelOptions]
    },
    detectedVars () {
      const t = this.templateEditor
      const parts = [t.subject, t.greeting, t.body_html, t.body_text, t.title].join(' ')
      const re = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g
      const found = new Set()
      let m
      while ((m = re.exec(parts)) !== null) found.add(m[1])
      return [...found]
    },
    templateSelectOptions () {
      return this.templates
        .filter((t) => t.channel === this.sendForm.channel && t.active)
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
        .map((t) => ({ value: t.template_key, text: t.name }))
    },
    filteredTemplatesForTable () {
      if (!this.filterChannel) return this.templates
      return this.templates.filter((t) => t.channel === this.filterChannel)
    },
    selectedSendTemplate () {
      return this.templates.find(
        (t) => t.template_key === this.sendForm.templateKey && t.channel === this.sendForm.channel
      ) || null
    },
    userSelectOptions () {
      return this.userOptions.map((u) => ({
        value: u.id,
        text: `${u.name || '—'} · ${u.email} (${u.user_type})`
      }))
    },
    isBuilderTemplate () {
      const key = String(this.templateEditor.template_key || '').trim()
      return BUILDER_TEMPLATE_KEYS.has(key)
    }
  },
  watch: {
    emailLayoutTab (val) {
      if (val === 0 && this.channelsTabActive) {
        this.$nextTick(() => this.refreshEmailLayoutEditors())
      }
      if (val === 1) {
        const ch = this.channelSettings.find((c) => c.channel === 'EMAIL')
        if (ch) this.refreshLayoutPreview(ch)
      }
    },
    activeTab (val) {
      if (val === 2) {
        this.$nextTick(() => this.refreshEmailLayoutEditors())
      }
    },
    templateBodyTab (val) {
      if (val === 0 && this.templateModal) {
        this.$nextTick(() => this.refreshTemplateBodyEditor())
      }
      if (val === 1) this.refreshEditorPreview()
    },
    detectedVars () {
      this.syncEditorPreviewVariables()
    }
  },
  mounted () {
    sofbox.index()
    this.loadAll()
  },
  methods: {
    async loadAll () {
      await Promise.all([
        this.loadTemplates(),
        this.loadChannelSettings(),
        this.loadLogs()
      ])
      this.debouncedUserSearch()
    },
    async loadTemplates () {
      const res = await this.$store.dispatch('getNotificationTemplates', {})
      if (res.success && res.data) {
        this.templates = res.data.templates || []
        if (res.data.channels) this.channels = res.data.channels
      }
    },
    templateLabel (templateKey, channel) {
      const t = this.templates.find((x) => x.template_key === templateKey && x.channel === channel)
      return t ? t.name : templateKey
    },
    onTemplateNameInput () {
      if (!this.templateEditor.id) {
        this.templateEditor.template_key = titleToCamelCase(this.templateEditor.name)
      }
      this.scheduleEditorPreview()
    },
    onTemplateEditorChannelChange () {
      this.templateBodyTab = 0
      this.clearEditorPreview()
      this.scheduleEditorPreview()
    },
    refreshHtmlEditorRef (refName) {
      const cmp = this.$refs[refName]
      if (cmp && typeof cmp.refreshEditor === 'function') {
        cmp.refreshEditor()
      }
    },
    refreshEmailLayoutEditors () {
      this.refreshHtmlEditorRef('emailHeaderHtmlEditor')
      this.refreshHtmlEditorRef('emailFooterHtmlEditor')
    },
    refreshTemplateBodyEditor () {
      this.refreshHtmlEditorRef('templateBodyHtmlEditor')
    },
    onTemplateModalShown () {
      this.$nextTick(() => {
        this.refreshTemplateBodyEditor()
        window.setTimeout(() => this.refreshTemplateBodyEditor(), 50)
      })
    },
    onEmailLayoutFieldInput (ch, field, value) {
      ch[field] = value
      this.scheduleLayoutPreview(ch)
    },
    scheduleLayoutPreview (ch) {
      clearTimeout(this.layoutPreviewTimer)
      this.layoutPreviewTimer = setTimeout(() => this.refreshLayoutPreview(ch), 400)
    },
    async refreshLayoutPreview (ch) {
      if (!ch || ch.channel !== 'EMAIL') return
      const res = await this.$store.dispatch('previewEmailLayout', {
        headerHtml: ch.headerHtml,
        footerHtml: ch.footerHtml
      })
      if (res.success && res.data) {
        this.layoutPreviewHtml = res.data.full_html || ''
      }
    },
    async loadChannelSettings () {
      const res = await this.$store.dispatch('getNotificationChannelSettings')
      if (res.success && res.data) {
        this.channelSettings = (res.data.channels || []).map((ch) => {
          const config = ch.config || {}
          return {
            ...ch,
            headerHtml: config.headerHtml || '',
            footerHtml: config.footerHtml || '',
            configJson: JSON.stringify(config, null, 0)
          }
        })
        const emailCh = this.channelSettings.find((c) => c.channel === 'EMAIL')
        if (emailCh) {
          this.refreshLayoutPreview(emailCh)
          if (this.channelsTabActive) {
            this.$nextTick(() => this.refreshEmailLayoutEditors())
          }
        }
      }
    },
    async loadLogs () {
      const res = await this.$store.dispatch('getNotificationSendLogs')
      if (res.success && res.data) this.sendLogs = res.data.logs || []
    },
    openTemplateEditor (row) {
      this.templateBodyTab = 0
      this.clearEditorPreview()
      this.templateEditor = row
        ? { ...row, body_html: row.body_html || '', body_text: row.body_text || '' }
        : emptyTemplateEditor()
      if (!row) this.onTemplateNameInput()
      this.syncEditorPreviewVariables()
      this.templateModal = true
    },
    resetTemplateEditor () {
      this.templateEditor = emptyTemplateEditor()
      this.templateBodyTab = 0
      this.clearEditorPreview()
      this.editorPreviewVariableRows = []
    },
    defaultPreviewValue (key) {
      if (PREVIEW_SAMPLE_DEFAULTS[key] != null) return PREVIEW_SAMPLE_DEFAULTS[key]
      return `Sample ${key}`
    },
    syncEditorPreviewVariables () {
      const vars = this.detectedVars.filter((k) => k && !AUTO_USER_VARS.has(k))
      const prev = {}
      for (const row of this.editorPreviewVariableRows) {
        if (row.key) prev[row.key] = row.value
      }
      this.editorPreviewVariableRows = vars.map((key) => ({
        key,
        value: prev[key] != null ? prev[key] : this.defaultPreviewValue(key)
      }))
    },
    buildEditorPreviewData () {
      const map = {}
      for (const row of this.editorPreviewVariableRows) {
        const k = String(row.key || '').trim()
        if (k) map[k] = row.value
      }
      if (!map.name) map.name = PREVIEW_SAMPLE_DEFAULTS.name
      if (!map.recipientName) map.recipientName = PREVIEW_SAMPLE_DEFAULTS.recipientName
      return map
    },
    buildEditorPreviewDraft () {
      const t = this.templateEditor
      return {
        subject: t.subject || '',
        greeting: t.greeting || '',
        body_html: t.body_html || '',
        body_text: t.body_text || '',
        title: t.title || ''
      }
    },
    clearEditorPreview () {
      this.editorPreviewFullHtml = ''
      this.editorPreviewText = ''
      this.editorPreviewSubject = ''
    },
    scheduleEditorPreview () {
      clearTimeout(this.editorPreviewTimer)
      this.editorPreviewTimer = setTimeout(() => {
        if (this.templateBodyTab === 1) this.refreshEditorPreview()
      }, 400)
    },
    async refreshEditorPreview () {
      const key = String(this.templateEditor.template_key || '').trim()
      if (!key && !this.templateEditor.body_html && !this.templateEditor.body_text) {
        this.clearEditorPreview()
        return
      }
      this.editorPreviewLoading = true
      const res = await this.$store.dispatch('previewNotificationTemplate', {
        templateKey: key,
        channel: this.templateEditor.channel,
        data: this.buildEditorPreviewData(),
        draft: this.buildEditorPreviewDraft()
      })
      this.editorPreviewLoading = false
      if (res.success && res.data) {
        const r = res.data.rendered || {}
        this.editorPreviewSubject = r.subject || ''
        this.editorPreviewFullHtml = r.full_html || r.body_html || ''
        this.editorPreviewText = r.body_text || r.body_html || ''
      }
    },
    async saveTemplate () {
      if (!this.templateEditor.template_key) {
        this.templateEditor.template_key = titleToCamelCase(this.templateEditor.name)
      }
      this.savingTemplate = true
      const payload = { ...this.templateEditor }
      const res = await this.$store.dispatch('saveNotificationTemplate', payload)
      this.savingTemplate = false
      if (res.success) {
        this.templateModal = false
        this.loadTemplates()
      }
    },
    async removeTemplate (row) {
      if (!window.confirm(this.$t('adminNotifications.confirmDeleteTemplate', { key: row.template_key, channel: row.channel }))) return
      const res = await this.$store.dispatch('deleteNotificationTemplate', { id: row.id })
      if (res.success) this.loadTemplates()
    },
    debouncedUserSearch () {
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(() => this.searchUsers(), 300)
    },
    async searchUsers () {
      const res = await this.$store.dispatch('searchNotificationUsers', {
        q: this.userSearch,
        types: this.sendForm.userTypes
      })
      if (res.success && res.data) this.userOptions = res.data.users || []
    },
    buildVariableMap () {
      const map = {}
      for (const row of this.sendForm.variableRows) {
        const k = String(row.key || '').trim()
        if (k) map[k] = row.value
      }
      return map
    },
    onSendChannelChange () {
      this.sendForm.templateKey = ''
      this.sendForm.variableRows = []
      this.clearPreview()
    },
    onSendTemplateChange () {
      this.syncVariablesFromTemplate()
      this.schedulePreview()
    },
    syncVariablesFromTemplate () {
      const t = this.selectedSendTemplate
      if (!t) {
        this.sendForm.variableRows = []
        return
      }
      const vars = (t.variables || []).filter((k) => k && !AUTO_USER_VARS.has(k))
      const prev = {}
      for (const row of this.sendForm.variableRows) {
        if (row.key) prev[row.key] = row.value
      }
      this.sendForm.variableRows = vars.map((key) => ({
        key,
        value: prev[key] != null ? prev[key] : ''
      }))
    },
    clearPreview () {
      this.previewHtml = ''
      this.previewFullHtml = ''
      this.previewText = ''
      this.previewSubject = ''
      this.previewTitle = ''
    },
    schedulePreview () {
      clearTimeout(this.previewTimer)
      this.previewTimer = setTimeout(() => this.refreshPreview(), 400)
    },
    async refreshPreview () {
      if (!this.sendForm.templateKey) {
        this.clearPreview()
        return
      }
      this.previewLoading = true
      const res = await this.$store.dispatch('previewNotificationTemplate', {
        templateKey: this.sendForm.templateKey,
        channel: this.sendForm.channel,
        data: this.buildVariableMap()
      })
      this.previewLoading = false
      if (res.success && res.data) {
        const r = res.data.rendered || {}
        this.previewSubject = r.subject || ''
        this.previewTitle = r.title || ''
        this.previewHtml = r.body_html || ''
        this.previewFullHtml = r.full_html || ''
        this.previewText = r.body_text || ''
      }
    },
    async sendBulk () {
      const userIds = Array.isArray(this.sendForm.userIds)
        ? this.sendForm.userIds
        : this.sendForm.userIds ? [this.sendForm.userIds] : []
      if (!userIds.length) return
      this.sending = true
      const res = await this.$store.dispatch('sendAdminNotifications', {
        templateKey: this.sendForm.templateKey,
        channel: this.sendForm.channel,
        userIds,
        data: this.buildVariableMap()
      })
      this.sending = false
      if (res.success) {
        this.loadLogs()
      }
    },
    async saveChannel (ch) {
      let config = {}
      if (ch.channel === 'EMAIL') {
        config = {
          headerHtml: ch.headerHtml || '',
          footerHtml: ch.footerHtml || ''
        }
      } else {
        try {
          config = ch.configJson ? JSON.parse(ch.configJson) : {}
        } catch (_) {
          this.$store.dispatch('alert/showAlert', { message: this.$t('adminNotifications.invalidJsonConfig'), type: 'danger' }, { root: true })
          return
        }
      }
      await this.$store.dispatch('saveNotificationChannelSettings', {
        channel: ch.channel,
        enabled: ch.enabled,
        provider: ch.provider,
        config
      })
    }
  }
}
</script>

<style scoped>
.admin-notifications-page code {
  font-size: 0.85em;
}
.preview-panel,
.template-body-preview {
  background: #fff !important;
}

.preview-panel .preview-html,
.template-body-preview .preview-html {
  max-height: 420px;
  overflow: auto;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px;
}
.template-body-preview {
  min-height: 120px;
}
</style>
