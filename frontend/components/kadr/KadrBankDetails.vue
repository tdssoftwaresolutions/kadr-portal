<template>
  <div class="kadr-bank-details">
    <div v-if="loading" class="kadr-bank-details__loading">
      <kadr-spinner size="sm" />
    </div>
    <kadr-empty-state
      v-else-if="!bankAccount"
      compact
      icon=""
      :title="$t('mediatorInvoices.noBankOnFile')"
    />
    <div v-else>
      <b-alert v-if="hasCorruptedFields" model-value variant="warning" class="small">
        {{ $t('mediatorInvoices.bankDetailsCorrupted') }}
      </b-alert>
      <div class="kadr-bank-details__grid">
        <button
          v-for="field in visibleFields"
          :key="field.key"
          type="button"
          class="kadr-bank-field"
          @click="copy(field.key, field.value)"
        >
          <span class="kadr-bank-field__label">{{ field.label }}</span>
          <span class="kadr-bank-field__value">{{ field.value }}</span>
          <span class="kadr-bank-field__copy">
            <i :class="copiedKey === field.key ? 'ri-check-line' : 'ri-file-copy-line'" aria-hidden="true"></i>
            {{ copiedKey === field.key ? $t('mediatorInvoices.copied') : $t('mediatorInvoices.copy') }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import KadrSpinner from './KadrSpinner.vue'
import KadrEmptyState from './KadrEmptyState.vue'

export default {
  name: 'KadrBankDetails',
  components: { KadrSpinner, KadrEmptyState },
  props: {
    bankAccount: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      copiedKey: null,
      copiedTimeout: null
    }
  },
  computed: {
    hasCorruptedFields () {
      return Boolean(this.bankAccount && this.bankAccount.corruptedFields && this.bankAccount.corruptedFields.length)
    },
    visibleFields () {
      if (!this.bankAccount) return []
      const b = this.bankAccount
      return [
        { key: 'bank_name', label: this.$t('mediatorInvoices.bankName'), value: b.bank_name },
        { key: 'account_holder', label: this.$t('mediatorInvoices.accountHolder'), value: b.account_holder },
        { key: 'account_number', label: this.$t('mediatorInvoices.accountNumber'), value: b.account_number },
        { key: 'ifsc_code', label: this.$t('mediatorInvoices.ifscCode'), value: b.ifsc_code },
        { key: 'branch_name', label: this.$t('mediatorInvoices.branch'), value: b.branch_name },
        { key: 'upi_id', label: this.$t('mediatorInvoices.upiId'), value: b.upi_id }
      ].filter((f) => f.value)
    }
  },
  beforeUnmount () {
    if (this.copiedTimeout) clearTimeout(this.copiedTimeout)
  },
  methods: {
    async copy (key, value) {
      try {
        await navigator.clipboard.writeText(String(value))
        this.copiedKey = key
        if (this.copiedTimeout) clearTimeout(this.copiedTimeout)
        this.copiedTimeout = setTimeout(() => { this.copiedKey = null }, 1500)
      } catch (e) {
        // Clipboard may be unavailable (permissions / insecure context); ignore silently.
      }
    }
  }
}
</script>

<style scoped>
.kadr-bank-details__loading {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0;
}

.kadr-bank-details__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.6rem;
}

.kadr-bank-field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--kadr-border);
  border-radius: 10px;
  background: var(--kadr-surface-muted);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.kadr-bank-field:hover {
  border-color: var(--kadr-primary-soft-border);
  background: var(--kadr-primary-soft);
}

.kadr-bank-field__label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--kadr-text-label);
}

.kadr-bank-field__value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--kadr-text-primary);
  overflow-wrap: anywhere;
}

.kadr-bank-field__copy {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  color: var(--kadr-text-secondary);
  margin-top: 0.15rem;
}
</style>
