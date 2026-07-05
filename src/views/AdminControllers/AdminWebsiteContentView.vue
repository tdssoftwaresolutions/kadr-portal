<template>
  <b-container fluid class="admin-website-content-page">
    <b-row class="mb-3 align-items-center">
      <b-col>
        <h4 class="mb-1">Website content</h4>
        <p class="text-muted small mb-0">
          Contact, banner, testimonials &amp; pricing are baked into static HTML when you save.
          FAQ and homepage blog stories load live from the API (updates appear immediately).
        </p>
      </b-col>
      <b-col cols="auto">
        <b-button size="sm" variant="outline-secondary" :disabled="loading" @click="regenerate">
          Regenerate pages
        </b-button>
      </b-col>
    </b-row>

    <b-overlay :show="loading" rounded>
      <b-tabs v-model="activeTab" content-class="mt-3">
        <b-tab title="Contact">
          <iq-card>
            <template v-slot:body>
              <b-form @submit.prevent="saveSettings">
                <b-row>
                  <b-col md="6"><b-form-group label="Email"><b-form-input v-model="settings.email" required /></b-form-group></b-col>
                  <b-col md="6"><b-form-group label="Phone"><b-form-input v-model="settings.phone" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group label="WhatsApp"><b-form-input v-model="settings.whatsapp" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group label="Address (EN)"><b-form-input v-model="settings.address_en" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group label="Address (HI)"><b-form-input v-model="settings.address_hi" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group label="Pricing footnote (EN)"><b-form-textarea v-model="settings.pricing_note_en" rows="2" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group label="Pricing footnote (HI)"><b-form-textarea v-model="settings.pricing_note_hi" rows="2" /></b-form-group></b-col>
                </b-row>
                <b-button type="submit" variant="primary" size="sm">Save contact &amp; regenerate</b-button>
              </b-form>
            </template>
          </iq-card>
        </b-tab>

        <b-tab title="Banner">
          <iq-card>
            <template v-slot:body>
              <b-form @submit.prevent="saveBanner">
                <b-form-checkbox v-model="banner.active" switch class="mb-3">Show banner on homepage</b-form-checkbox>
                <b-row>
                  <b-col md="4"><b-form-group label="Tag (EN)"><b-form-input v-model="banner.tag_en" /></b-form-group></b-col>
                  <b-col md="4"><b-form-group label="Tag (HI)"><b-form-input v-model="banner.tag_hi" /></b-form-group></b-col>
                  <b-col md="4"><b-form-group label="Link URL"><b-form-input v-model="banner.link_url" placeholder="/#kadr-organisations" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group label="Message (EN) — HTML allowed"><b-form-textarea v-model="banner.text_en" rows="3" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group label="Message (HI) — HTML allowed"><b-form-textarea v-model="banner.text_hi" rows="3" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group label="Link text (EN)"><b-form-input v-model="banner.link_text_en" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group label="Link text (HI)"><b-form-input v-model="banner.link_text_hi" /></b-form-group></b-col>
                </b-row>
                <b-button type="submit" variant="primary" size="sm">Save banner &amp; regenerate</b-button>
              </b-form>
            </template>
          </iq-card>
        </b-tab>

        <b-tab title="Testimonials">
          <iq-card class="mb-3">
            <template v-slot:headerTitle><h5 class="mb-0">Add / edit testimonial</h5></template>
            <template v-slot:body>
              <b-form @submit.prevent="saveTestimonial">
                <b-row>
                  <b-col md="6"><b-form-group label="Quote (English)"><b-form-textarea v-model="testimonialForm.quote_en" rows="3" required /></b-form-group></b-col>
                  <b-col md="6"><b-form-group label="Quote (Hindi)"><b-form-textarea v-model="testimonialForm.quote_hi" rows="3" placeholder="Optional — falls back to English" /></b-form-group></b-col>
                  <b-col md="6"><b-form-group label="Customer name"><b-form-input v-model="testimonialForm.customer_name" required /></b-form-group></b-col>
                  <b-col md="6"><b-form-group label="Designation"><b-form-input v-model="testimonialForm.designation" placeholder="e.g. Small Business Owner, Delhi" /></b-form-group></b-col>
                  <b-col md="6">
                    <b-form-group label="Star rating">
                      <div class="star-picker" role="group" aria-label="Star rating">
                        <button
                          v-for="n in 5"
                          :key="n"
                          type="button"
                          class="star-picker__star"
                          :class="{ 'star-picker__star--active': n <= testimonialForm.stars }"
                          :aria-label="n + ' stars'"
                          @click="testimonialForm.stars = n"
                        >★</button>
                      </div>
                    </b-form-group>
                  </b-col>
                  <b-col md="6" class="d-flex align-items-end"><b-form-checkbox v-model="testimonialForm.active" switch>Show on website</b-form-checkbox></b-col>
                </b-row>
                <p class="small text-muted mb-2">Newest testimonials appear first on the homepage.</p>
                <b-button type="submit" variant="primary" size="sm" class="mr-2">{{ testimonialForm.id ? 'Update' : 'Add' }}</b-button>
                <b-button v-if="testimonialForm.id" size="sm" variant="outline-secondary" @click="resetTestimonialForm">Cancel edit</b-button>
              </b-form>
            </template>
          </iq-card>
          <b-table :items="testimonials" :fields="testimonialFields" small responsive striped>
            <template #cell(stars)="row"><span class="text-warning">{{ '★'.repeat(row.item.stars || 0) }}</span></template>
            <template #cell(customer_name)="row">{{ row.item.author_name }}</template>
            <template #cell(designation)="row">{{ row.item.role_en }}</template>
            <template #cell(created_at)="row">{{ formatDate(row.item.created_at) }}</template>
            <template #cell(active)="row"><b-badge :variant="row.item.active ? 'success' : 'secondary'">{{ row.item.active ? 'Yes' : 'No' }}</b-badge></template>
            <template #cell(actions)="row">
              <b-button size="sm" variant="link" @click="editTestimonial(row.item)">Edit</b-button>
              <b-button size="sm" variant="link" class="text-danger" @click="removeTestimonial(row.item)">Delete</b-button>
            </template>
          </b-table>
        </b-tab>

        <b-tab title="Pricing">
          <iq-card class="mb-3">
            <template v-slot:headerTitle><h5 class="mb-0">Pricing plan</h5></template>
            <template v-slot:body>
              <b-form @submit.prevent="savePricingPlan">
                <b-row>
                  <b-col md="4"><b-form-group label="Name (EN)"><b-form-input v-model="planForm.name_en" required /></b-form-group></b-col>
                  <b-col md="4"><b-form-group label="Name (HI)"><b-form-input v-model="planForm.name_hi" required /></b-form-group></b-col>
                  <b-col md="4"><b-form-group label="Price display"><b-form-input v-model="planForm.price_display" placeholder="2,999 or Custom" required /></b-form-group></b-col>
                  <b-col md="4"><b-form-group label="Period (EN)"><b-form-input v-model="planForm.period_en" /></b-form-group></b-col>
                  <b-col md="4"><b-form-group label="Period (HI)"><b-form-input v-model="planForm.period_hi" /></b-form-group></b-col>
                  <b-col md="4"><b-form-group label="Button style">
                    <b-form-select v-model="planForm.button_style" :options="buttonStyleOptions" />
                  </b-form-group></b-col>
                  <b-col md="3"><b-form-checkbox v-model="planForm.is_popular" switch class="mt-4">Most popular</b-form-checkbox></b-col>
                  <b-col md="3"><b-form-checkbox v-model="planForm.active" switch class="mt-4">Active</b-form-checkbox></b-col>
                  <b-col md="3"><b-form-group label="Badge (EN)"><b-form-input v-model="planForm.badge_en" /></b-form-group></b-col>
                  <b-col md="3"><b-form-group label="Sort order"><b-form-input v-model.number="planForm.sort_order" type="number" /></b-form-group></b-col>
                </b-row>
                <h6 class="mt-3">Features</h6>
                <div v-for="(feat, idx) in planForm.features" :key="idx" class="border rounded p-2 mb-2">
                  <b-row>
                    <b-col md="5"><b-form-input v-model="feat.text_en" placeholder="Feature (EN)" /></b-col>
                    <b-col md="5"><b-form-input v-model="feat.text_hi" placeholder="Feature (HI)" /></b-col>
                    <b-col md="2" class="d-flex align-items-center">
                      <b-form-checkbox v-model="feat.included" switch>Included</b-form-checkbox>
                      <b-button size="sm" variant="link" class="text-danger ml-auto" @click="planForm.features.splice(idx, 1)">×</b-button>
                    </b-col>
                  </b-row>
                </div>
                <b-button size="sm" variant="outline-secondary" class="mb-3" @click="planForm.features.push(emptyFeature())">Add feature</b-button>
                <div>
                  <b-button type="submit" variant="primary" size="sm" class="mr-2">{{ planForm.id ? 'Update plan' : 'Add plan' }}</b-button>
                  <b-button v-if="planForm.id" size="sm" variant="outline-secondary" @click="resetPlanForm">Cancel edit</b-button>
                </div>
              </b-form>
            </template>
          </iq-card>
          <b-table :items="pricingPlans" :fields="planFields" small responsive striped>
            <template #cell(is_popular)="row"><span v-if="row.item.is_popular">★</span></template>
            <template #cell(actions)="row">
              <b-button size="sm" variant="link" @click="editPlan(row.item)">Edit</b-button>
              <b-button size="sm" variant="link" class="text-danger" @click="removePlan(row.item)">Delete</b-button>
            </template>
          </b-table>
        </b-tab>

        <b-tab title="FAQ">
          <b-row>
            <b-col lg="4">
              <iq-card class="mb-3">
                <template v-slot:headerTitle><h5 class="mb-0">Categories</h5></template>
                <template v-slot:body>
                  <b-form @submit.prevent="saveFaqCategory">
                    <b-form-group label="Name (EN)"><b-form-input v-model="categoryForm.name_en" required /></b-form-group>
                    <b-form-group label="Name (HI)"><b-form-input v-model="categoryForm.name_hi" required /></b-form-group>
                    <b-form-group label="Sort order"><b-form-input v-model.number="categoryForm.sort_order" type="number" /></b-form-group>
                    <b-form-checkbox v-model="categoryForm.active" switch class="mb-3">Active</b-form-checkbox>
                    <b-button type="submit" size="sm" variant="primary" class="mr-2">{{ categoryForm.id ? 'Update' : 'Add' }}</b-button>
                    <b-button v-if="categoryForm.id" size="sm" variant="outline-secondary" @click="resetCategoryForm">Cancel</b-button>
                  </b-form>
                  <hr />
                  <div v-for="cat in faqCategories" :key="cat.id" class="d-flex align-items-center mb-2">
                    <span class="flex-grow-1 small">{{ cat.name_en }}</span>
                    <b-button size="sm" variant="link" @click="editCategory(cat)">Edit</b-button>
                    <b-button size="sm" variant="link" class="text-danger" @click="removeCategory(cat)">Del</b-button>
                  </div>
                </template>
              </iq-card>
            </b-col>
            <b-col lg="8">
              <iq-card>
                <template v-slot:headerTitle><h5 class="mb-0">FAQ items</h5></template>
                <template v-slot:body>
                  <b-form @submit.prevent="saveFaqItem">
                    <b-form-group label="Category">
                      <b-form-select v-model="faqForm.category_id" :options="categoryOptions" required />
                    </b-form-group>
                    <b-form-group label="Question (EN)"><b-form-textarea v-model="faqForm.question_en" rows="2" required /></b-form-group>
                    <b-form-group label="Question (HI)"><b-form-textarea v-model="faqForm.question_hi" rows="2" required /></b-form-group>
                    <b-form-group label="Answer (EN)"><b-form-textarea v-model="faqForm.answer_en" rows="3" required /></b-form-group>
                    <b-form-group label="Answer (HI)"><b-form-textarea v-model="faqForm.answer_hi" rows="3" required /></b-form-group>
                    <b-row>
                      <b-col md="4"><b-form-group label="Sort order"><b-form-input v-model.number="faqForm.sort_order" type="number" /></b-form-group></b-col>
                      <b-col md="4" class="d-flex align-items-end"><b-form-checkbox v-model="faqForm.active" switch>Active</b-form-checkbox></b-col>
                    </b-row>
                    <b-button type="submit" size="sm" variant="primary" class="mr-2">{{ faqForm.id ? 'Update' : 'Add' }}</b-button>
                    <b-button v-if="faqForm.id" size="sm" variant="outline-secondary" @click="resetFaqForm">Cancel</b-button>
                  </b-form>
                  <hr />
                  <div v-for="cat in faqCategories" :key="'items-' + cat.id" class="mb-3">
                    <strong class="small d-block mb-1">{{ cat.name_en }}</strong>
                    <div v-for="item in cat.items" :key="item.id" class="border rounded p-2 mb-2 small">
                      <div class="d-flex">
                        <span class="flex-grow-1">{{ item.question_en }}</span>
                        <b-button size="sm" variant="link" @click="editFaqItem(item)">Edit</b-button>
                        <b-button size="sm" variant="link" class="text-danger" @click="removeFaqItem(item)">Del</b-button>
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
      faqForm: this.emptyFaqItem(),
      testimonialFields: [
        { key: 'customer_name', label: 'Customer' },
        { key: 'designation', label: 'Designation' },
        { key: 'stars', label: 'Rating' },
        { key: 'created_at', label: 'Added' },
        { key: 'active', label: 'Active' },
        { key: 'actions', label: '' }
      ],
      planFields: [
        { key: 'name_en', label: 'Plan' },
        { key: 'price_display', label: 'Price' },
        { key: 'is_popular', label: 'Popular' },
        { key: 'sort_order', label: 'Order' },
        { key: 'actions', label: '' }
      ],
      buttonStyleOptions: [
        { value: 'secondary', text: 'Secondary' },
        { value: 'primary', text: 'Primary' },
        { value: 'outline-brown', text: 'Outline brown' }
      ]
    }
  },
  computed: {
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
      if (!value) return '—'
      return new Date(value).toLocaleDateString()
    },
    async saveTestimonial () {
      const res = await this.$store.dispatch('saveAdminWebsiteTestimonial', { ...this.testimonialForm })
      if (res.success) { this.resetTestimonialForm(); await this.loadContent() }
    },
    async removeTestimonial (item) {
      if (!window.confirm('Delete this testimonial?')) return
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
      if (!window.confirm('Delete this pricing plan?')) return
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
      if (!window.confirm('Delete category and all its FAQ items?')) return
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
      if (!window.confirm('Delete this FAQ item?')) return
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
  color: #d8dce0;
  cursor: pointer;
  padding: 0 2px;
}
.star-picker__star--active {
  color: #d4a830;
}
.star-picker__star:hover,
.star-picker__star:focus {
  color: #b48a20;
  outline: none;
}
</style>
