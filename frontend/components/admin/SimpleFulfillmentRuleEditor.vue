<template>
  <div class="simple-fulfillment-editor">
    <p class="small text-muted mb-3">
      Choose what happens when someone redeems this reward. You can turn on more than one — they run in order.
    </p>

    <div class="action-card mb-3">
      <b-form-checkbox v-model="local.grantPro" switch class="mb-0 font-weight-bold" @change="emitUpdate">
        Give Pro subscription
      </b-form-checkbox>
      <b-form-group v-if="local.grantPro" label="For how many days?" label-size="sm" class="mt-2 mb-0 ms-4">
        <b-form-input v-model.number="local.proDays" type="number" min="1" max="3650" style="max-width: 120px" @input="emitUpdate" />
      </b-form-group>
    </div>

    <div class="action-card mb-3">
      <b-form-checkbox v-model="local.markFulfilled" switch class="mb-0 font-weight-bold" @change="emitUpdate">
        Mark reward as completed
      </b-form-checkbox>
      <p v-if="local.markFulfilled" class="small text-muted mb-0 mt-2 ms-4">Closes the redemption so it shows as fulfilled.</p>
    </div>

    <div class="action-card mb-0">
      <b-form-checkbox v-model="local.sendEmail" switch class="mb-0 font-weight-bold" @change="onSendEmailToggle">
        Send email to mediator
      </b-form-checkbox>
      <template v-if="local.sendEmail">
        <p class="small text-muted mt-2 mb-2 ms-4">
          Write only the main message. We add greeting, header, and footer automatically.
        </p>
        <b-form-group label="Email subject" label-size="sm" class="ms-4 mb-2">
          <b-form-input v-model="local.emailSubject" placeholder="Your reward from Kadr" @input="emitUpdate" />
        </b-form-group>
        <div class="ms-4 email-editor-wrap">
          <label class="small font-weight-bold d-block mb-1">Message</label>
          <editor
            v-if="emailEditorReady"
            :key="emailEditorKey"
            v-model="emailMessageHtml"
            :init="editorOptions"
            license-key="gpl"
            @input="onEmailInput"
          />
          <b-form-textarea
            v-else
            v-model="emailMessageHtml"
            rows="5"
            placeholder="Loading editor…"
            disabled
          />
        </div>
      </template>
    </div>

    <b-alert v-if="validationError" model-value variant="warning" class="small mt-3 mb-0">{{ validationError }}</b-alert>
  </div>
</template>

<script>
import '../../plugins/tinymce'
import Editor from '@tinymce/tinymce-vue'
import { defaultSimpleRule, validateSimpleRule } from '../../utils/fulfillmentRuleSimple'

export default {
  name: 'SimpleFulfillmentRuleEditor',
  components: { editor: Editor },
  props: {
    /** Initial values when modal opens; do not sync continuously from parent. */
    initialRule: {
      type: Object,
      default: () => defaultSimpleRule()
    }
  },
  data () {
    return {
      local: defaultSimpleRule(),
      emailMessageHtml: '',
      emailEditorReady: false,
      emailEditorKey: 0,
      validationError: '',
      editorOptions: {
        // Self-hosted TinyMCE 5 (skin CSS imported in src/plugins/tinymce.js).
        skin: false,
        content_css: false,
        height: 260,
        menubar: false,
        branding: false,
        statusbar: false,
        plugins: 'lists paste',
        toolbar: 'undo redo | bold italic underline | bullist numlist',
        content_style: 'body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; }',
        paste_as_text: false,
        browser_spellcheck: true
      }
    }
  },
  created () {
    this.loadFromRule(this.initialRule)
  },
  methods: {
    loadFromRule (rule) {
      this.local = { ...defaultSimpleRule(), ...(rule || {}) }
      this.emailMessageHtml = this.local.emailMessage || defaultSimpleRule().emailMessage
      this.validationError = ''
    },
    /** Call when parent modal finishes opening so TinyMCE mounts in a visible container. */
    onModalShown () {
      if (this.local.sendEmail) {
        this.mountEmailEditor()
      }
    },
    onSendEmailToggle (checked) {
      if (checked) {
        if (!this.emailMessageHtml) {
          this.emailMessageHtml = defaultSimpleRule().emailMessage
        }
        this.$nextTick(() => this.mountEmailEditor())
      } else {
        this.emailEditorReady = false
      }
      this.emitUpdate()
    },
    mountEmailEditor () {
      this.emailEditorReady = false
      this.$nextTick(() => {
        this.emailEditorKey += 1
        this.emailEditorReady = true
      })
    },
    onEmailInput (html) {
      this.emailMessageHtml = html
      this.emitUpdate()
    },
    emitUpdate () {
      this.validationError = ''
    },
    getRule () {
      return {
        ...this.local,
        emailMessage: this.emailMessageHtml
      }
    },
    validate () {
      const err = validateSimpleRule(this.getRule())
      this.validationError = err || ''
      return !err
    }
  }
}
</script>

<style scoped>
.action-card {
  border: 1px solid #e8ecf5;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  background: #fafcff;
}
.email-editor-wrap {
  position: relative;
  z-index: 1;
}
.email-editor-wrap :deep(.tox-tinymce) {
  border-radius: 6px;
}
</style>
