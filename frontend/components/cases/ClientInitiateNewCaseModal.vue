<template>
  <b-modal
    :model-value="visible"
    title="Start a new case"
    size="lg"
    no-footer
    scrollable
    @update:model-value="onVisibilityChange"
    @hidden="onHidden"
  >
    <p class="text-muted small mb-3">
      Submit dispute details and the opposite party. Your existing account will be used — no new signup is created.
      An admin will assign the case type (Mediation, Arbitrator, or Counsellor) before payment and assignment continue.
    </p>

    <div v-if="step === 1">
      <div class="mb-3">
        <label for="new-case-description">Describe your dispute in brief <span class="text-danger">*</span></label>
        <textarea
          id="new-case-description"
          v-model="form.description"
          class="form-control"
          placeholder="Describe your complaint"
          style="height:150px"
        />
      </div>
      <div class="mb-3">
        <label for="new-case-category">Complaint Category <span class="text-danger">*</span></label>
        <select id="new-case-category" v-model="form.category" class="form-control">
          <option value="" disabled>Select Category</option>
          <option value="Payment related">Payment Related</option>
          <option value="Family related">Family Related</option>
          <option value="E-commerce">E-Commerce</option>
          <option value="Insurance">Insurance</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="mb-3">
        <label for="new-case-evidence">Upload Evidence</label>
        <div class="file-upload">
          <input id="new-case-evidence" type="file" class="form-control-file" @change="onEvidenceChange" />
          <span v-if="form.evidence" class="file-name ms-2">{{ form.evidence.name }}</span>
        </div>
      </div>
      <div class="d-flex justify-content-end">
        <b-button variant="secondary" class="me-2" @click="$emit('close')">Cancel</b-button>
        <b-button variant="primary" @click="goNext">Next</b-button>
      </div>
    </div>

    <div v-else>
      <div class="mb-3">
        <label for="new-case-opp-name">Opposite Party Name <span class="text-danger">*</span></label>
        <input id="new-case-opp-name" v-model="form.oppositeName" type="text" class="form-control" placeholder="Name" />
      </div>
      <div class="mb-3">
        <label for="new-case-opp-email">Opposite Party Email <span class="text-danger">*</span></label>
        <input id="new-case-opp-email" v-model="form.oppositeEmail" type="email" class="form-control" placeholder="Email" />
      </div>
      <div class="mb-3">
        <label for="new-case-opp-phone">Opposite Party Phone <span class="text-danger">*</span></label>
        <input id="new-case-opp-phone" v-model="form.oppositePhone" type="tel" class="form-control" placeholder="Phone" />
      </div>
      <p class="text-muted small mb-2">
        Your representative (e.g. your lawyer) can join to view this case, attend meetings, and act on your behalf.
      </p>
      <div class="mb-3">
        <label for="new-case-rep-name">Representative Name</label>
        <input id="new-case-rep-name" v-model="form.representativeName" type="text" class="form-control" placeholder="Full name (optional)" />
      </div>
      <div class="mb-3">
        <label for="new-case-rep-email">Representative Email <span class="text-danger">*</span></label>
        <input id="new-case-rep-email" v-model="form.representativeEmail" type="email" class="form-control" placeholder="Email" />
      </div>
      <div class="mb-3">
        <label for="new-case-rep-phone">Representative Phone</label>
        <input id="new-case-rep-phone" v-model="form.representativePhone" type="tel" class="form-control" placeholder="Phone (optional)" />
      </div>
      <div class="mb-3 border rounded p-3 bg-light">
        <b-form-checkbox v-model="form.adultPlatformLiabilityAck">
          I confirm that I am 18 years of age or older, that I take full responsibility for my actions on this platform, and that I agree to use the services in accordance with the platform’s terms and policies.
        </b-form-checkbox>
      </div>
      <div class="d-flex justify-content-between">
        <b-button variant="secondary" @click="step = 1">Previous</b-button>
        <div>
          <b-button variant="secondary" class="me-2" @click="$emit('close')">Cancel</b-button>
          <b-button variant="success" :disabled="submitting" @click="submit">
            <kadr-spinner v-if="submitting" size="sm" class="me-1" />
            Submit case
          </b-button>
        </div>
      </div>
    </div>
  </b-modal>
</template>

<script>
export default {
  name: 'ClientInitiateNewCaseModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      step: 1,
      submitting: false,
      form: this.emptyForm()
    }
  },
  methods: {
    emptyForm () {
      return {
        description: '',
        category: '',
        evidence: null,
        evidenceContent: null,
        oppositeName: '',
        oppositeEmail: '',
        oppositePhone: '',
        representativeName: '',
        representativeEmail: '',
        representativePhone: '',
        adultPlatformLiabilityAck: false
      }
    },
    resetForm () {
      this.step = 1
      this.submitting = false
      this.form = this.emptyForm()
    },
    onVisibilityChange (val) {
      if (!val) this.$emit('close')
    },
    onHidden () {
      this.resetForm()
      this.$emit('close')
    },
    onEvidenceChange (event) {
      const file = event.target.files && event.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        this.form.evidenceContent = reader.result
      }
      reader.readAsDataURL(file)
      this.form.evidence = file
    },
    showAlert (message, type = 'danger') {
      this.$store.dispatch('alert/showAlert', { message, type }, { root: true })
    },
    goNext () {
      if (!this.form.description.trim()) {
        this.showAlert('Enter complaint description')
        return
      }
      if (!this.form.category) {
        this.showAlert('Select complaint category')
        return
      }
      if (this.form.evidence) {
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png'
        ]
        const maxSize = 2 * 1024 * 1024
        if (!allowedTypes.includes(this.form.evidence.type)) {
          this.showAlert('Invalid file type. Allowed types: PDF, DOC, DOCX, JPEG, PNG.')
          return
        }
        if (this.form.evidence.size > maxSize) {
          this.showAlert('File size exceeds 2MB.')
          return
        }
      }
      this.step = 2
    },
    async submit () {
      if (!this.form.oppositeName.trim()) {
        this.showAlert('Enter opposite party name')
        return
      }
      if (!this.form.oppositeEmail.trim()) {
        this.showAlert('Enter opposite party email')
        return
      }
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailPattern.test(this.form.oppositeEmail)) {
        this.showAlert('Invalid opposite party email address')
        return
      }
      if (!this.form.oppositePhone.trim()) {
        this.showAlert('Enter opposite party phone')
        return
      }
      const phonePattern = /^(?:\+91|0)?[789]\d{9}$/
      if (!phonePattern.test(this.form.oppositePhone)) {
        this.showAlert('Enter a valid opposite party phone number')
        return
      }
      if (!this.form.representativeEmail.trim()) {
        this.showAlert('Enter representative email')
        return
      }
      if (!emailPattern.test(this.form.representativeEmail)) {
        this.showAlert('Invalid representative email address')
        return
      }
      if (this.form.representativePhone.trim() && !phonePattern.test(this.form.representativePhone)) {
        this.showAlert('Enter a valid representative phone number')
        return
      }
      if (!this.form.adultPlatformLiabilityAck) {
        this.showAlert('Please confirm that you are 18+ and accept responsibility for your use of the platform.')
        return
      }
      this.submitting = true
      try {
        const response = await this.$store.dispatch('initiateNewCase', {
          description: this.form.description.trim(),
          category: this.form.category,
          evidenceContent: this.form.evidenceContent,
          oppositeName: this.form.oppositeName.trim(),
          oppositeEmail: this.form.oppositeEmail.trim().toLowerCase(),
          oppositePhone: this.form.oppositePhone.trim(),
          representativeName: this.form.representativeName.trim(),
          representativeEmail: this.form.representativeEmail.trim().toLowerCase(),
          representativePhone: this.form.representativePhone.trim(),
          adultPlatformLiabilityAck: true
        })
        if (response.success) {
          this.$emit('submitted')
          this.$emit('close')
        }
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>
