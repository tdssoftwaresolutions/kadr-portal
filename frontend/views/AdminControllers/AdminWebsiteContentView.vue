<template>
  <b-container fluid class="admin-website-content-page kadr-animate-in">
    <b-row class="mb-3 align-items-center">
      <b-col>
        <h4 class="mb-1">{{ $t('adminWebsite.title') }}</h4>
        <p class="text-muted small mb-0">
          {{ $t('adminWebsite.subtitle') }}
        </p>
      </b-col>
      <b-col cols="auto">
        <b-button size="sm" variant="outline-secondary" :disabled="loading" @click="regenerate">
          {{ $t('adminWebsite.regeneratePages') }}
        </b-button>
      </b-col>
    </b-row>

    <b-overlay :show="loading" rounded>
      <b-tabs v-model="activeTab" content-class="mt-3">
        <b-tab :title="$t('adminWebsite.tabContact')">
          <iq-card>
            <template v-slot:body>
              <b-form @submit.prevent="saveSettings">
                <b-row>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.email')"><b-form-input v-model="settings.email" required /></b-form-group></b-col>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.phone')"><b-form-input v-model="settings.phone" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.whatsapp')"><b-form-input v-model="settings.whatsapp" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.addressEn')"><b-form-input v-model="settings.address_en" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.addressHi')"><b-form-input v-model="settings.address_hi" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.pricingNoteEn')"><b-form-textarea v-model="settings.pricing_note_en" rows="2" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.pricingNoteHi')"><b-form-textarea v-model="settings.pricing_note_hi" rows="2" /></b-form-group></b-col>
                </b-row>
                <b-button type="submit" variant="primary" size="sm">{{ $t('adminWebsite.saveContact') }}</b-button>
              </b-form>
            </template>
          </iq-card>
        </b-tab>

        <b-tab :title="$t('adminWebsite.tabBanner')">
          <iq-card>
            <template v-slot:body>
              <b-form @submit.prevent="saveBanner">
                <b-form-checkbox v-model="banner.active" switch class="mb-3">{{ $t('adminWebsite.showBanner') }}</b-form-checkbox>
                <b-row>
                  <b-col md="4"><b-form-group :label="$t('adminWebsite.tagEn')"><b-form-input v-model="banner.tag_en" /></b-form-group></b-col>
                  <b-col md="4"><b-form-group :label="$t('adminWebsite.tagHi')"><b-form-input v-model="banner.tag_hi" /></b-form-group></b-col>
                  <b-col md="4"><b-form-group :label="$t('adminWebsite.linkUrl')"><b-form-input v-model="banner.link_url" placeholder="/#kadr-organisations" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.messageEn')"><b-form-textarea v-model="banner.text_en" rows="3" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.messageHi')"><b-form-textarea v-model="banner.text_hi" rows="3" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.linkTextEn')"><b-form-input v-model="banner.link_text_en" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.linkTextHi')"><b-form-input v-model="banner.link_text_hi" /></b-form-group></b-col>
                </b-row>
                <b-button type="submit" variant="primary" size="sm">{{ $t('adminWebsite.saveBanner') }}</b-button>
              </b-form>
            </template>
          </iq-card>
        </b-tab>

        <b-tab :title="$t('adminWebsite.tabTestimonials')">
          <iq-card class="mb-3">
            <template v-slot:headerTitle><h5 class="mb-0">{{ $t('adminWebsite.addEditTestimonial') }}</h5></template>
            <template v-slot:body>
              <b-form @submit.prevent="saveTestimonial">
                <b-row>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.quoteEn')"><b-form-textarea v-model="testimonialForm.quote_en" rows="3" required /></b-form-group></b-col>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.quoteHi')"><b-form-textarea v-model="testimonialForm.quote_hi" rows="3" :placeholder="$t('adminWebsite.quoteHiPlaceholder')" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.customerName')"><b-form-input v-model="testimonialForm.customer_name" required /></b-form-group></b-col>
                  <b-col md="6"><b-form-group :label="$t('adminWebsite.designation')"><b-form-input v-model="testimonialForm.designation" :placeholder="$t('adminWebsite.designationPlaceholder')" /></b-form-group></b-col>
                  <b-col md="6">
                    <b-form-group :label="$t('adminWebsite.starRating')">
                      <div class="star-picker" role="group" :aria-label="$t('adminWebsite.starRating')">
                        <button
                          v-for="n in 5"
                          :key="n"
                          type="button"
                          class="star-picker__star"
                          :class="{ 'star-picker__star--active': n <= testimonialForm.stars }"
                          :aria-label="$t('adminWebsite.starsAria', { n })"
                          @click="testimonialForm.stars = n"
                        >★</button>
                      </div>
                    </b-form-group>
                  </b-col>
                  <b-col md="6" class="d-flex align-items-end"><b-form-checkbox v-model="testimonialForm.active" switch>{{ $t('adminWebsite.showOnWebsite') }}</b-form-checkbox></b-col>
                </b-row>
                <p class="small text-muted mb-2">{{ $t('adminWebsite.newestFirst') }}</p>
                <b-button type="submit" variant="primary" size="sm" class="me-2">{{ testimonialForm.id ? $t('adminWebsite.update') : $t('adminWebsite.add') }}</b-button>
                <b-button v-if="testimonialForm.id" size="sm" variant="outline-secondary" @click="resetTestimonialForm">{{ $t('adminWebsite.cancelEdit') }}</b-button>
              </b-form>
            </template>
          </iq-card>
          <b-table :items="testimonials" :fields="testimonialFields" small responsive striped>
            <template #cell(stars)="row"><span class="text-warning">{{ '★'.repeat(row.item.stars || 0) }}</span></template>
            <template #cell(customer_name)="row">{{ row.item.author_name }}</template>
            <template #cell(designation)="row">{{ row.item.role_en }}</template>
            <template #cell(created_at)="row">{{ formatDate(row.item.created_at) }}</template>
            <template #cell(active)="row"><b-badge :variant="row.item.active ? 'success' : 'secondary'">{{ row.item.active ? $t('adminWebsite.yes') : $t('adminWebsite.no') }}</b-badge></template>
            <template #cell(actions)="row">
              <b-button size="sm" variant="link" @click="editTestimonial(row.item)">{{ $t('adminWebsite.edit') }}</b-button>
              <b-button size="sm" variant="link" class="text-danger" @click="removeTestimonial(row.item)">{{ $t('adminWebsite.delete') }}</b-button>
            </template>
          </b-table>
        </b-tab>

        <b-tab :title="$t('adminWebsite.tabPricing')">
          <iq-card class="mb-3">
            <template v-slot:headerTitle><h5 class="mb-0">{{ $t('adminWebsite.pricingPlan') }}</h5></template>
            <template v-slot:body>
              <b-form @submit.prevent="savePricingPlan">
                <b-row>
                  <b-col md="4"><b-form-group :label="$t('adminWebsite.nameEn')"><b-form-input v-model="planForm.name_en" required /></b-form-group></b-col>
                  <b-col md="4"><b-form-group :label="$t('adminWebsite.nameHi')"><b-form-input v-model="planForm.name_hi" required /></b-form-group></b-col>
                  <b-col md="4"><b-form-group :label="$t('adminWebsite.priceDisplay')"><b-form-input v-model="planForm.price_display" :placeholder="$t('adminWebsite.priceDisplayPlaceholder')" required /></b-form-group></b-col>
                  <b-col md="4"><b-form-group :label="$t('adminWebsite.periodEn')"><b-form-input v-model="planForm.period_en" /></b-form-group></b-col>
                  <b-col md="4"><b-form-group :label="$t('adminWebsite.periodHi')"><b-form-input v-model="planForm.period_hi" /></b-form-group></b-col>
                  <b-col md="4"><b-form-group :label="$t('adminWebsite.buttonStyle')">
                    <b-form-select v-model="planForm.button_style" :options="buttonStyleOptions" />
                  </b-form-group></b-col>
                  <b-col md="3"><b-form-checkbox v-model="planForm.is_popular" switch class="mt-4">{{ $t('adminWebsite.mostPopular') }}</b-form-checkbox></b-col>
                  <b-col md="3"><b-form-checkbox v-model="planForm.active" switch class="mt-4">{{ $t('adminWebsite.active') }}</b-form-checkbox></b-col>
                  <b-col md="3"><b-form-group :label="$t('adminWebsite.badgeEn')"><b-form-input v-model="planForm.badge_en" /></b-form-group></b-col>
                  <b-col md="3"><b-form-group :label="$t('adminWebsite.sortOrder')"><b-form-input v-model.number="planForm.sort_order" type="number" /></b-form-group></b-col>
                </b-row>
                <h6 class="mt-3">{{ $t('adminWebsite.features') }}</h6>
                <div v-for="(feat, idx) in planForm.features" :key="idx" class="border rounded p-2 mb-2">
                  <b-row>
                    <b-col md="5"><b-form-input v-model="feat.text_en" :placeholder="$t('adminWebsite.featureEn')" /></b-col>
                    <b-col md="5"><b-form-input v-model="feat.text_hi" :placeholder="$t('adminWebsite.featureHi')" /></b-col>
                    <b-col md="2" class="d-flex align-items-center">
                      <b-form-checkbox v-model="feat.included" switch>{{ $t('adminWebsite.included') }}</b-form-checkbox>
                      <b-button size="sm" variant="link" class="text-danger ms-auto" @click="planForm.features.splice(idx, 1)">×</b-button>
                    </b-col>
                  </b-row>
                </div>
                <b-button size="sm" variant="outline-secondary" class="mb-3" @click="planForm.features.push(emptyFeature())">{{ $t('adminWebsite.addFeature') }}</b-button>
                <div>
                  <b-button type="submit" variant="primary" size="sm" class="me-2">{{ planForm.id ? $t('adminWebsite.updatePlan') : $t('adminWebsite.addPlan') }}</b-button>
                  <b-button v-if="planForm.id" size="sm" variant="outline-secondary" @click="resetPlanForm">{{ $t('adminWebsite.cancelEdit') }}</b-button>
                </div>
              </b-form>
            </template>
          </iq-card>
          <b-table :items="pricingPlans" :fields="planFields" small responsive striped>
            <template #cell(is_popular)="row"><span v-if="row.item.is_popular">★</span></template>
            <template #cell(actions)="row">
              <b-button size="sm" variant="link" @click="editPlan(row.item)">{{ $t('adminWebsite.edit') }}</b-button>
              <b-button size="sm" variant="link" class="text-danger" @click="removePlan(row.item)">{{ $t('adminWebsite.delete') }}</b-button>
            </template>
          </b-table>
        </b-tab>

        <b-tab :title="$t('adminWebsite.tabFaq')">
          <b-row>
            <b-col lg="4">
              <iq-card class="mb-3">
                <template v-slot:headerTitle><h5 class="mb-0">{{ $t('adminWebsite.categories') }}</h5></template>
                <template v-slot:body>
                  <b-form @submit.prevent="saveFaqCategory">
                    <b-form-group :label="$t('adminWebsite.nameEn')"><b-form-input v-model="categoryForm.name_en" required /></b-form-group>
                    <b-form-group :label="$t('adminWebsite.nameHi')"><b-form-input v-model="categoryForm.name_hi" required /></b-form-group>
                    <b-form-group :label="$t('adminWebsite.sortOrder')"><b-form-input v-model.number="categoryForm.sort_order" type="number" /></b-form-group>
                    <b-form-checkbox v-model="categoryForm.active" switch class="mb-3">{{ $t('adminWebsite.active') }}</b-form-checkbox>
                    <b-button type="submit" size="sm" variant="primary" class="me-2">{{ categoryForm.id ? $t('adminWebsite.update') : $t('adminWebsite.add') }}</b-button>
                    <b-button v-if="categoryForm.id" size="sm" variant="outline-secondary" @click="resetCategoryForm">{{ $t('adminWebsite.cancel') }}</b-button>
                  </b-form>
                  <hr />
                  <div v-for="cat in faqCategories" :key="cat.id" class="d-flex align-items-center mb-2">
                    <span class="flex-grow-1 small">{{ cat.name_en }}</span>
                    <b-button size="sm" variant="link" @click="editCategory(cat)">{{ $t('adminWebsite.edit') }}</b-button>
                    <b-button size="sm" variant="link" class="text-danger" @click="removeCategory(cat)">{{ $t('adminWebsite.del') }}</b-button>
                  </div>
                </template>
              </iq-card>
            </b-col>
            <b-col lg="8">
              <iq-card>
                <template v-slot:headerTitle><h5 class="mb-0">{{ $t('adminWebsite.faqItems') }}</h5></template>
                <template v-slot:body>
                  <b-form @submit.prevent="saveFaqItem">
                    <b-form-group :label="$t('adminWebsite.category')">
                      <b-form-select v-model="faqForm.category_id" :options="categoryOptions" required />
                    </b-form-group>
                    <b-form-group :label="$t('adminWebsite.questionEn')"><b-form-textarea v-model="faqForm.question_en" rows="2" required /></b-form-group>
                    <b-form-group :label="$t('adminWebsite.questionHi')"><b-form-textarea v-model="faqForm.question_hi" rows="2" required /></b-form-group>
                    <b-form-group :label="$t('adminWebsite.answerEn')"><b-form-textarea v-model="faqForm.answer_en" rows="3" required /></b-form-group>
                    <b-form-group :label="$t('adminWebsite.answerHi')"><b-form-textarea v-model="faqForm.answer_hi" rows="3" required /></b-form-group>
                    <b-row>
                      <b-col md="4"><b-form-group :label="$t('adminWebsite.sortOrder')"><b-form-input v-model.number="faqForm.sort_order" type="number" /></b-form-group></b-col>
                      <b-col md="4" class="d-flex align-items-end"><b-form-checkbox v-model="faqForm.active" switch>{{ $t('adminWebsite.active') }}</b-form-checkbox></b-col>
                    </b-row>
                    <b-button type="submit" size="sm" variant="primary" class="me-2">{{ faqForm.id ? $t('adminWebsite.update') : $t('adminWebsite.add') }}</b-button>
                    <b-button v-if="faqForm.id" size="sm" variant="outline-secondary" @click="resetFaqForm">{{ $t('adminWebsite.cancel') }}</b-button>
                  </b-form>
                  <hr />
                  <div v-for="cat in faqCategories" :key="'items-' + cat.id" class="mb-3">
                    <strong class="small d-block mb-1">{{ cat.name_en }}</strong>
                    <div v-for="item in cat.items" :key="item.id" class="border rounded p-2 mb-2 small">
                      <div class="d-flex">
                        <span class="flex-grow-1">{{ item.question_en }}</span>
                        <b-button size="sm" variant="link" @click="editFaqItem(item)">{{ $t('adminWebsite.edit') }}</b-button>
                        <b-button size="sm" variant="link" class="text-danger" @click="removeFaqItem(item)">{{ $t('adminWebsite.del') }}</b-button>
                      </div>
                    </div>
                  </div>
                </template>
              </iq-card>
            </b-col>
          </b-row>
        </b-tab>
      </b-tabs>
    </b-overlay>
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'AdminWebsiteContentView',
  data () {
    return {
      loading: false,
      activeTab: 0,
      settings: {},
      banner: {},
      testimonials: [],
      pricingPlans: [],
      faqCategories: [],
      testimonialForm: this.emptyTestimonial(),
      planForm: this.emptyPlan(),
      categoryForm: this.emptyCategory(),
      faqForm: this.emptyFaqItem()
    }
  },
  computed: {
    testimonialFields () {
      return [
        { key: 'customer_name', label: this.$t('adminWebsite.colCustomer') },
        { key: 'designation', label: this.$t('adminWebsite.colDesignation') },
        { key: 'stars', label: this.$t('adminWebsite.colRating') },
        { key: 'created_at', label: this.$t('adminWebsite.colAdded') },
        { key: 'active', label: this.$t('adminWebsite.colActive') },
        { key: 'actions', label: '' }
      ]
    },
    planFields () {
      return [
        { key: 'name_en', label: this.$t('adminWebsite.colPlan') },
        { key: 'price_display', label: this.$t('adminWebsite.colPrice') },
        { key: 'is_popular', label: this.$t('adminWebsite.colPopular') },
        { key: 'sort_order', label: this.$t('adminWebsite.colOrder') },
        { key: 'actions', label: '' }
      ]
    },
    buttonStyleOptions () {
      return [
        { value: 'secondary', text: this.$t('adminWebsite.btnSecondary') },
        { value: 'primary', text: this.$t('adminWebsite.btnPrimary') },
        { value: 'outline-brown', text: this.$t('adminWebsite.btnOutlineBrown') }
      ]
    },
    categoryOptions () {
      return this.faqCategories.map((c) => ({ value: c.id, text: c.name_en }))
    }
  },
  mounted () {
    sofbox.index()
    this.loadContent()
  },
  methods: {
    emptyFeature () {
      return { text_en: '', text_hi: '', included: true, sort_order: 0 }
    },
    emptyTestimonial () {
      return { quote_en: '', quote_hi: '', customer_name: '', designation: '', stars: 5, active: true }
    },
    emptyPlan () {
      return { name_en: '', name_hi: '', price_display: '', period_en: '', period_hi: '', is_popular: false, badge_en: '', badge_hi: '', button_style: 'secondary', sort_order: 0, active: true, features: [this.emptyFeature()] }
    },
    emptyCategory () {
      return { name_en: '', name_hi: '', sort_order: 0, active: true }
    },
    emptyFaqItem () {
      return { category_id: '', question_en: '', question_hi: '', answer_en: '', answer_hi: '', sort_order: 0, active: true }
    },
    applyPayload (payload) {
      this.settings = payload.settings || {}
      this.banner = payload.banner || {}
      this.testimonials = payload.testimonials || []
      this.pricingPlans = payload.pricingPlans || []
      this.faqCategories = payload.faqCategories || []
    },
    async loadContent () {
      this.loading = true
      try {
        const res = await this.$store.dispatch('getAdminWebsiteContent')
        if (res.success && res.data) this.applyPayload(res.data)
      } finally {
        this.loading = false
      }
    },
    async regenerate () {
      this.loading = true
      try {
        const res = await this.$store.dispatch('regenerateAdminWebsiteContent')
        if (res.success && res.data) this.applyPayload(res.data)
      } finally {
        this.loading = false
      }
    },
    async saveSettings () {
      const res = await this.$store.dispatch('saveAdminWebsiteSettings', { ...this.settings })
      if (res.success && res.data?.settings) this.settings = res.data.settings
    },
    async saveBanner () {
      const res = await this.$store.dispatch('saveAdminWebsiteBanner', { ...this.banner })
      if (res.success && res.data?.banner) this.banner = res.data.banner
    },
    resetTestimonialForm () { this.testimonialForm = this.emptyTestimonial() },
    editTestimonial (item) {
      this.testimonialForm = {
        id: item.id,
        quote_en: item.quote_en,
        quote_hi: item.quote_hi,
        customer_name: item.author_name,
        designation: item.role_en,
        stars: item.stars || 5,
        active: item.active !== false
      }
    },
    formatDate (value) {
      return this.$formatDate(value)
    },
    async saveTestimonial () {
      const res = await this.$store.dispatch('saveAdminWebsiteTestimonial', { ...this.testimonialForm })
      if (res.success) { this.resetTestimonialForm(); await this.loadContent() }
    },
    async removeTestimonial (item) {
      if (!window.confirm(this.$t('adminWebsite.confirmDeleteTestimonial'))) return
      const res = await this.$store.dispatch('deleteAdminWebsiteTestimonial', item.id)
      if (res.success) await this.loadContent()
    },
    resetPlanForm () { this.planForm = this.emptyPlan() },
    editPlan (item) {
      this.planForm = {
        ...item,
        features: (item.features || []).map((f) => ({ ...f }))
      }
      if (!this.planForm.features.length) this.planForm.features = [this.emptyFeature()]
    },
    async savePricingPlan () {
      const res = await this.$store.dispatch('saveAdminWebsitePricingPlan', { ...this.planForm })
      if (res.success) { this.resetPlanForm(); await this.loadContent() }
    },
    async removePlan (item) {
      if (!window.confirm(this.$t('adminWebsite.confirmDeletePlan'))) return
      const res = await this.$store.dispatch('deleteAdminWebsitePricingPlan', item.id)
      if (res.success) await this.loadContent()
    },
    resetCategoryForm () { this.categoryForm = this.emptyCategory() },
    editCategory (cat) { this.categoryForm = { ...cat } },
    async saveFaqCategory () {
      const res = await this.$store.dispatch('saveAdminWebsiteFaqCategory', { ...this.categoryForm })
      if (res.success) { this.resetCategoryForm(); await this.loadContent() }
    },
    async removeCategory (cat) {
      if (!window.confirm(this.$t('adminWebsite.confirmDeleteCategory'))) return
      const res = await this.$store.dispatch('deleteAdminWebsiteFaqCategory', cat.id)
      if (res.success) await this.loadContent()
    },
    resetFaqForm () { this.faqForm = this.emptyFaqItem() },
    editFaqItem (item) { this.faqForm = { ...item } },
    async saveFaqItem () {
      const res = await this.$store.dispatch('saveAdminWebsiteFaqItem', { ...this.faqForm })
      if (res.success) { this.resetFaqForm(); await this.loadContent() }
    },
    async removeFaqItem (item) {
      if (!window.confirm(this.$t('adminWebsite.confirmDeleteFaq'))) return
      const res = await this.$store.dispatch('deleteAdminWebsiteFaqItem', item.id)
      if (res.success) await this.loadContent()
    }
  }
}
</script>

<style scoped>
.star-picker {
  display: flex;
  gap: 4px;
}
.star-picker__star {
  border: none;
  background: none;
  font-size: 1.75rem;
  line-height: 1;
  color: var(--kadr-border-strong);
  cursor: pointer;
  padding: 0 2px;
}
.star-picker__star--active {
  color: var(--kadr-warning);
}
.star-picker__star:hover,
.star-picker__star:focus {
  color: var(--kadr-status-warning-text);
  outline: none;
}
</style>
