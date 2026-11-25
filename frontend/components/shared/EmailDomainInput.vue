<template>
  <div class="email-domain-input">
    <input
      :id="id"
      ref="input"
      type="email"
      class="app-input"
      :value="modelValue"
      :disabled="disabled"
      :placeholder="placeholder"
      autocomplete="email"
      aria-autocomplete="list"
      :aria-expanded="suggestionsVisible"
      :aria-controls="listboxId"
      :aria-activedescendant="activeOptionId"
      @input="onInput"
      @keydown="onKeydown"
      @focus="onFocus"
      @blur="onBlur"
    />
    <ul
      v-if="suggestionsVisible"
      :id="listboxId"
      class="email-domain-suggestions"
      role="listbox"
      aria-label="Email domain suggestions"
    >
      <li v-for="(domain, index) in suggestions" :key="domain" role="presentation">
        <button
          :id="optionId(index)"
          type="button"
          class="email-domain-option"
          :class="{ 'is-active': index === activeIndex }"
          role="option"
          :aria-selected="index === activeIndex"
          @mousedown.prevent="selectDomain(domain)"
          @mouseenter="activeIndex = index"
        >
          <span>{{ emailPrefix }}@</span><strong>{{ domain }}</strong>
        </button>
      </li>
    </ul>
  </div>
</template>

<script>
const COMMON_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'yahoo.co.in',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'rediffmail.com',
  'zoho.com',
  'proton.me',
  'protonmail.com',
  'fastmail.com',
  'gmx.com',
  'aol.com',
  'yandex.com',
  'mail.com',
  'hey.com',
  'tuta.com',
  'tutamail.com',
  'indiatimes.com',
  'sify.com'
]

export default {
  name: 'EmailDomainInput',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    id: {
      type: String,
      required: true
    },
    placeholder: {
      type: String,
      default: 'you@example.com'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  data () {
    return {
      isFocused: false,
      activeIndex: -1,
      domains: COMMON_EMAIL_DOMAINS
    }
  },
  computed: {
    emailPrefix () {
      const atIndex = this.modelValue.lastIndexOf('@')
      return atIndex < 0 ? '' : this.modelValue.slice(0, atIndex)
    },
    typedDomain () {
      const atIndex = this.modelValue.lastIndexOf('@')
      return atIndex < 0 ? '' : this.modelValue.slice(atIndex + 1).toLowerCase()
    },
    suggestions () {
      if (!this.emailPrefix) return []
      return this.domains.filter(domain => domain.startsWith(this.typedDomain))
    },
    suggestionsVisible () {
      return this.isFocused && !this.disabled && this.suggestions.length > 0
    },
    listboxId () {
      return `${this.id}-domain-listbox`
    },
    activeOptionId () {
      return this.activeIndex >= 0 && this.suggestions[this.activeIndex]
        ? this.optionId(this.activeIndex)
        : undefined
    }
  },
  watch: {
    suggestions () {
      this.activeIndex = -1
    }
  },
  methods: {
    optionId (index) {
      return `${this.id}-domain-option-${index}`
    },
    onInput (event) {
      this.$emit('update:modelValue', event.target.value)
    },
    onFocus () {
      this.isFocused = true
    },
    onBlur () {
      this.isFocused = false
      this.activeIndex = -1
    },
    onKeydown (event) {
      if (!this.suggestionsVisible) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        this.activeIndex = (this.activeIndex + 1) % this.suggestions.length
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        this.activeIndex = this.activeIndex <= 0
          ? this.suggestions.length - 1
          : this.activeIndex - 1
      } else if (event.key === 'Enter' && this.activeIndex >= 0) {
        event.preventDefault()
        this.selectDomain(this.suggestions[this.activeIndex])
      } else if (event.key === 'Escape') {
        this.isFocused = false
        this.activeIndex = -1
      }
    },
    selectDomain (domain) {
      const atIndex = this.modelValue.lastIndexOf('@')
      if (atIndex < 0) return
      this.$emit('update:modelValue', `${this.modelValue.slice(0, atIndex + 1)}${domain}`)
      this.isFocused = false
      this.activeIndex = -1
    }
  }
}
</script>

<style scoped>
.email-domain-input {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
}

.email-domain-input .app-input {
  width: 100%;
}

.email-domain-suggestions {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.25rem);
  left: 0;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 0.3rem;
  list-style: none;
  background: #fff;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  box-shadow: 0 8px 20px rgba(16, 24, 40, 0.14);
}

.email-domain-option {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 0.55rem 0.65rem;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #344054;
  font: inherit;
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
  cursor: pointer;
}

.email-domain-option strong {
  font-weight: 600;
}

.email-domain-option:hover,
.email-domain-option.is-active {
  background: #f2f4f7;
}
</style>
