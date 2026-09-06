<template>
  <iq-card class="h-100 admin-settings-compact">
    <template v-slot:headerTitle>
      <h4 class="card-title mb-0">{{ $t('adminCoupons.title') }}</h4>
    </template>
    <template v-slot:body>
      <p class="text-muted compact-hint mb-2">
        {{ $t('adminCoupons.hint') }}
      </p>
      <b-button size="sm" variant="primary" class="mb-3" @click="openForm()">{{ $t('adminCoupons.addCoupon') }}</b-button>

      <b-table :items="items" :fields="couponFields" small responsive class="compact-table">
        <template #cell(code)="row">
          <code class="coupon-code-cell">{{ row.item.code }}</code>
        </template>
        <template #cell(premium_days)="row">
          {{ row.item.premium_days > 0 ? $t('adminCoupons.daysValue', { days: row.item.premium_days }) : '—' }}
        </template>
        <template #cell(usage)="row">
          {{ usageLabel(row.item) }}
        </template>
        <template #cell(active)="row">
          <b-badge :variant="row.item.active ? 'success' : 'secondary'">{{ row.item.active ? $t('adminCoupons.active') : $t('adminCoupons.inactive') }}</b-badge>
        </template>
        <template #cell(actions)="row">
          <b-button size="sm" variant="outline-danger" @click="removeItem(row.item)">{{ $t('adminCoupons.delete') }}</b-button>
        </template>
      </b-table>
      <div v-if="!items.length && !loading" class="text-muted small py-2">{{ $t('adminCoupons.noItems') }}</div>

      <b-modal v-model="formVisible" :title="$t('adminCoupons.addCoupon')" @hidden="resetForm">
        <b-form @submit.prevent="saveItem">
          <b-form-group :label="$t('adminCoupons.code')" label-size="sm">
            <b-form-input v-model="form.code" required class="text-uppercase" maxlength="40" :placeholder="$t('adminCoupons.codePlaceholder')" />
          </b-form-group>
          <b-form-group :label="$t('adminCoupons.couponTitle')" label-size="sm">
            <b-form-input v-model="form.title" required :placeholder="$t('adminCoupons.titlePlaceholder')" />
          </b-form-group>
          <b-form-group :label="$t('adminCoupons.description')" label-size="sm">
            <b-form-textarea v-model="form.description" rows="2" :placeholder="$t('adminCoupons.descriptionPlaceholder')" />
          </b-form-group>
          <b-form-group :label="$t('adminCoupons.premiumDays')" label-size="sm" :description="$t('adminCoupons.premiumDaysHint')">
            <b-form-input v-model.number="form.premiumDays" type="number" min="0" />
          </b-form-group>
          <b-form-group :label="$t('adminCoupons.usageLimit')" label-size="sm" :description="$t('adminCoupons.usageLimitHint')">
            <b-form-input v-model="form.usageLimit" type="number" min="0" :placeholder="$t('adminCoupons.unlimitedPlaceholder')" />
          </b-form-group>
          <b-form-checkbox v-model="form.active">{{ $t('adminCoupons.activeSwitch') }}</b-form-checkbox>
        </b-form>
        <template #footer>
          <b-button variant="secondary" @click="formVisible = false">{{ $t('adminCoupons.cancel') }}</b-button>
          <b-button variant="primary" @click="saveItem">{{ $t('adminCoupons.save') }}</b-button>
        </template>
      </b-modal>
    </template>
  </iq-card>
</template>

<script>
export default {
  name: 'AdminCouponCodesPanel',
  data () {
    return {
      items: [],
      loading: false,
      formVisible: false,
      form: this.emptyForm()
    }
  },
  computed: {
    couponFields () {
      return [
        { key: 'code', label: this.$t('adminCoupons.colCode') },
        { key: 'title', label: this.$t('adminCoupons.colTitle') },
        { key: 'premium_days', label: this.$t('adminCoupons.colPremium') },
        { key: 'usage', label: this.$t('adminCoupons.colUsage') },
        { key: 'active', label: this.$t('adminCoupons.colStatus') },
        { key: 'actions', label: '' }
      ]
    }
  },
  mounted () {
    this.load()
  },
  methods: {
    emptyForm () {
      return {
        code: '',
        title: '',
        description: '',
        premiumDays: 0,
        usageLimit: '',
        active: true
      }
    },
    resetForm () {
      this.form = this.emptyForm()
    },
    usageLabel (item) {
      if (item.usage_limit === null || item.usage_limit === undefined) {
        return this.$t('adminCoupons.unlimitedRedeemed', { count: item.redeemed_count })
      }
      return this.$t('adminCoupons.limitedUsage', { used: item.redeemed_count, total: item.usage_limit })
    },
    async load () {
      this.loading = true
      try {
        const res = await this.$store.dispatch('getCoupons')
        if (res.success && res.data) this.items = res.data.coupons || []
      } finally {
        this.loading = false
      }
    },
    openForm () {
      this.form = this.emptyForm()
      this.formVisible = true
    },
    async saveItem () {
      const payload = {
        code: this.form.code,
        title: this.form.title,
        description: this.form.description,
        premiumDays: this.form.premiumDays,
        // Empty string → unlimited (null on the backend).
        usageLimit: this.form.usageLimit === '' || this.form.usageLimit === null ? null : this.form.usageLimit,
        active: this.form.active
      }
      const res = await this.$store.dispatch('createCoupon', payload)
      if (res.success) {
        this.formVisible = false
        this.load()
      }
    },
    async removeItem (item) {
      if (!window.confirm(this.$t('adminCoupons.confirmRemove', { code: item.code }))) return
      const res = await this.$store.dispatch('deleteCoupon', { id: item.id })
      if (res.success) this.load()
    }
  }
}
</script>

<style scoped>
.coupon-code-cell {
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--kadr-primary);
}
</style>
