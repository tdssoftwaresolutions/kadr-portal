<template>
  <div class="fulfillment-rules-panel">
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap">
      <div>
        <h6 class="mb-1">Reward fulfillment rules</h6>
        <p class="small text-muted mb-0">
          When a mediator redeems an AUTO reward, the rule runs automatically (Pro days, mark done, email).
        </p>
      </div>
      <b-button size="sm" variant="primary" @click="openEditor()">Create rule</b-button>
    </div>

    <b-table :items="rules" :fields="ruleFields" small responsive class="mb-0">
      <template #cell(active)="row">
        <b-badge :variant="row.item.active ? 'success' : 'secondary'">{{ row.item.active ? 'Active' : 'Off' }}</b-badge>
      </template>
      <template #cell(summary)="row">
        <span class="small">{{ row.item.summary || '—' }}</span>
      </template>
      <template #cell(actions)="row">
        <b-button size="sm" variant="outline-primary" class="mr-1" @click="openEditor(row.item)">Edit</b-button>
        <b-button size="sm" variant="outline-danger" @click="removeRule(row.item)">Delete</b-button>
      </template>
    </b-table>
    <p v-if="!rules.length && !loading" class="text-muted small mt-2 mb-0">
      No rules yet. Create one, then attach it to a reward catalog item (AUTO fulfillment).
    </p>

    <b-modal
      v-model="editorVisible"
      size="lg"
      :title="editor.id ? 'Edit fulfillment rule' : 'Create fulfillment rule'"
      scrollable
      @shown="onEditorModalShown"
      @hidden="resetEditor"
    >
      <b-form @submit.prevent="saveEditor">
        <b-row>
          <b-col md="8">
            <b-form-group label="Rule name" label-size="sm">
              <b-form-input v-model="editor.name" required placeholder="e.g. Pro — 30 days + email" />
            </b-form-group>
          </b-col>
          <b-col md="4" class="d-flex align-items-end">
            <b-form-checkbox v-model="editor.active" switch class="mb-3">Active</b-form-checkbox>
          </b-col>
        </b-row>
        <b-form-group label="Note for admins (optional)" label-size="sm">
          <b-form-input v-model="editor.description" placeholder="Internal note only" />
        </b-form-group>

        <hr class="my-3" />
        <h6 class="mb-0">What happens on redeem</h6>
        <simple-fulfillment-rule-editor
          :key="editorSessionKey"
          ref="ruleEditor"
          :initial-rule="editorInitialRule"
        />
      </b-form>

      <template #modal-footer>
        <b-button variant="secondary" @click="editorVisible = false">Cancel</b-button>
        <b-button variant="primary" :disabled="saving" @click="saveEditor">{{ saving ? 'Saving…' : 'Save rule' }}</b-button>
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
  simpleRuleSummary,
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
      },
      ruleFields: [
        { key: 'name', label: 'Rule' },
        { key: 'summary', label: 'What it does' },
        { key: 'active', label: 'Status' },
        { key: 'actions', label: '' }
      ]
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    async load () {
      this.loading = true
      try {
        const res = await this.$store.dispatch('getRewardFulfillmentRules')
        if (res.success) {
          this.rules = (res.data?.rules || res.rules || []).map((r) => ({
            ...r,
            summary: r.summary || this.summaryFromFlow(r.flow)
          }))
        }
      } finally {
        this.loading = false
      }
    },
    summaryFromFlow (flow) {
      try {
        return simpleRuleSummary(flowToSimple(flow))
      } catch {
        return '—'
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
        this.$store.dispatch('alert/showAlert', { message: 'Enter a rule name.', type: 'warning' }, { root: true })
        return
      }
      const editorCmp = this.$refs.ruleEditor
      if (editorCmp && !editorCmp.validate()) return

      const ruleToSave = editorCmp && typeof editorCmp.getRule === 'function'
        ? editorCmp.getRule()
        : this.editorInitialRule

      const err = validateSimpleRule(ruleToSave)
      if (err) {
        this.$store.dispatch('alert/showAlert', { message: err, type: 'warning' }, { root: true })
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
      if (!window.confirm(`Delete rule "${rule.name}"?`)) return
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
