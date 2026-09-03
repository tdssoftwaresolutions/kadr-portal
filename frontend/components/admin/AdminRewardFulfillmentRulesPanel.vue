<template>
  <div class="fulfillment-rules-panel">
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap">
      <div>
        <h6 class="mb-1">{{ $t('adminPremium.rulesTitle') }}</h6>
        <p class="small text-muted mb-0">
          {{ $t('adminPremium.rulesHint') }}
        </p>
      </div>
      <b-button size="sm" variant="primary" @click="openEditor()">{{ $t('adminPremium.createRule') }}</b-button>
    </div>

    <b-table :items="rules" :fields="ruleFields" small responsive class="mb-0">
      <template #cell(active)="row">
        <b-badge :variant="row.item.active ? 'success' : 'secondary'">{{ row.item.active ? $t('adminPremium.ruleActive') : $t('adminPremium.ruleOff') }}</b-badge>
      </template>
      <template #cell(summary)="row">
        <span class="small">{{ localizedSummary(row.item) || '—' }}</span>
      </template>
      <template #cell(actions)="row">
        <b-button size="sm" variant="outline-primary" class="me-1" @click="openEditor(row.item)">{{ $t('adminPremium.edit') }}</b-button>
        <b-button size="sm" variant="outline-danger" @click="removeRule(row.item)">{{ $t('adminPremium.delete') }}</b-button>
      </template>
    </b-table>
    <p v-if="!rules.length && !loading" class="text-muted small mt-2 mb-0">
      {{ $t('adminPremium.noRules') }}
    </p>

    <b-modal
      v-model="editorVisible"
      size="lg"
      :title="editor.id ? $t('adminPremium.editRule') : $t('adminPremium.createRuleTitle')"
      scrollable
      @shown="onEditorModalShown"
      @hidden="resetEditor"
    >
      <b-form @submit.prevent="saveEditor">
        <b-row>
          <b-col md="8">
            <b-form-group :label="$t('adminPremium.ruleName')" label-size="sm">
              <b-form-input v-model="editor.name" required :placeholder="$t('adminPremium.ruleNamePlaceholder')" />
            </b-form-group>
          </b-col>
          <b-col md="4" class="d-flex align-items-end">
            <b-form-checkbox v-model="editor.active" switch class="mb-3">{{ $t('adminPremium.activeSwitch') }}</b-form-checkbox>
          </b-col>
        </b-row>
        <b-form-group :label="$t('adminPremium.noteForAdmins')" label-size="sm">
          <b-form-input v-model="editor.description" :placeholder="$t('adminPremium.internalNote')" />
        </b-form-group>

        <hr class="my-3" />
        <h6 class="mb-0">{{ $t('adminPremium.whatHappens') }}</h6>
        <simple-fulfillment-rule-editor
          :key="editorSessionKey"
          ref="ruleEditor"
          :initial-rule="editorInitialRule"
        />
      </b-form>

      <template #footer>
        <b-button variant="secondary" @click="editorVisible = false">{{ $t('adminPremium.cancel') }}</b-button>
        <b-button variant="primary" :disabled="saving" @click="saveEditor">{{ saving ? $t('adminPremium.saving') : $t('adminPremium.saveRule') }}</b-button>
      </template>
    </b-modal>
  </div>
</template>

<script>
import SimpleFulfillmentRuleEditor from './SimpleFulfillmentRuleEditor.vue'
import {
  defaultSimpleRule,
  flowToSimple,
  simpleToFlow,
  validateSimpleRule
} from '../../utils/fulfillmentRuleSimple'

export default {
  name: 'AdminRewardFulfillmentRulesPanel',
  components: { SimpleFulfillmentRuleEditor },
  data () {
    return {
      loading: false,
      saving: false,
      rules: [],
      editorVisible: false,
      editorSessionKey: 0,
      editorInitialRule: defaultSimpleRule(),
      editor: {
        id: null,
        name: '',
        description: '',
        active: true
      }
    }
  },
  computed: {
    ruleFields () {
      return [
        { key: 'name', label: this.$t('adminPremium.colRule') },
        { key: 'summary', label: this.$t('adminPremium.colWhatItDoes') },
        { key: 'active', label: this.$t('adminPremium.colStatus') },
        { key: 'actions', label: '' }
      ]
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    localizedSummary (rule) {
      let simple
      try {
        simple = flowToSimple(rule.flow)
      } catch {
        return '—'
      }
      const parts = []
      if (simple.grantPro) parts.push(this.$t('adminPremium.summaryProDays', { days: simple.proDays || 30 }))
      if (simple.markFulfilled) parts.push(this.$t('adminPremium.summaryMarkFulfilled'))
      if (simple.sendEmail && simple.emailMessage && String(simple.emailMessage).replace(/<[^>]+>/g, '').trim()) {
        parts.push(this.$t('adminPremium.summarySendEmail'))
      }
      return parts.length ? parts.join(' · ') : this.$t('adminPremium.summaryNoActions')
    },
    async load () {
      this.loading = true
      try {
        const res = await this.$store.dispatch('getRewardFulfillmentRules')
        if (res.success) {
          this.rules = res.data?.rules || res.rules || []
        }
      } finally {
        this.loading = false
      }
    },
    resetEditor () {
      this.editor = { id: null, name: '', description: '', active: true }
      this.editorInitialRule = defaultSimpleRule()
    },
    openEditor (rule = null) {
      if (rule) {
        this.editor = {
          id: rule.id,
          name: rule.name,
          description: rule.description || '',
          active: rule.active !== false
        }
        this.editorInitialRule = flowToSimple(rule.flow)
      } else {
        this.resetEditor()
      }
      this.editorSessionKey += 1
      this.editorVisible = true
    },
    onEditorModalShown () {
      const editor = this.$refs.ruleEditor
      if (editor && typeof editor.onModalShown === 'function') {
        editor.onModalShown()
      }
    },
    async saveEditor () {
      if (!this.editor.name || !String(this.editor.name).trim()) {
        this.$store.dispatch('alert/showAlert', { message: this.$t('adminPremium.enterRuleName'), type: 'warning' }, { root: true })
        return
      }
      const editorCmp = this.$refs.ruleEditor
      if (editorCmp && !editorCmp.validate()) return

      const ruleToSave = editorCmp && typeof editorCmp.getRule === 'function'
        ? editorCmp.getRule()
        : this.editorInitialRule

      const errKey = validateSimpleRule(ruleToSave)
      if (errKey) {
        this.$store.dispatch('alert/showAlert', { message: this.$t(errKey), type: 'warning' }, { root: true })
        return
      }

      this.saving = true
      try {
        const flow = simpleToFlow(ruleToSave)
        const res = await this.$store.dispatch('saveRewardFulfillmentRule', {
          id: this.editor.id,
          name: this.editor.name,
          description: this.editor.description,
          active: this.editor.active,
          flow
        })
        if (res.success) {
          this.editorVisible = false
          await this.load()
          this.$emit('rules-changed')
        }
      } finally {
        this.saving = false
      }
    },
    async removeRule (rule) {
      if (!window.confirm(this.$t('adminPremium.confirmDeleteRule', { name: rule.name }))) return
      const res = await this.$store.dispatch('deleteRewardFulfillmentRule', { id: rule.id })
      if (res.success) {
        await this.load()
        this.$emit('rules-changed')
      }
    }
  }
}
</script>

<style scoped>
.fulfillment-rules-panel {
  margin-top: 1rem;
}
</style>

<style>
/* TinyMCE inside Bootstrap modal — keep editor and toolbars interactive */
.modal.show .tox-tinymce,
.modal.show .tox-editor-container,
.modal.show .tox-edit-area__iframe {
  pointer-events: auto !important;
}
.modal.show .tox-tinymce-aux {
  z-index: 2000 !important;
}
</style>
