<template>
  <b-container fluid class="kadr-animate-in">
    <kadr-page-header :title="$t('adminEmailCorrections.title')" :subtitle="$t('adminEmailCorrections.subtitle')" />
    <b-row>
      <b-col sm="12">
        <iq-card>
          <template v-slot:body>
            <div class="d-flex mb-3">
              <b-form-select v-model="statusFilter" :options="statusOptions" style="max-width: 220px;" @change="fetchRequests(1)" />
            </div>

            <b-row v-if="requests.length > 0">
              <b-col md="6" v-for="req in requests" :key="req.id" class="mb-3">
                <b-card class="h-100">
                  <b-card-body>
                    <div class="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h6 class="mb-1">{{ $t('adminEmailCorrections.caseLabel') }} {{ req.case?.caseId || '—' }}</h6>
                        <small class="text-muted">{{ formatDate(req.created_at) }}</small>
                      </div>
                      <b-badge :variant="statusVariant(req.status)">{{ req.status }}</b-badge>
                    </div>
                    <p class="mb-1"><strong>{{ $t('adminEmailCorrections.requestedBy') }}:</strong> {{ req.requester?.name }} ({{ req.requester?.email }})</p>
                    <p class="mb-1"><strong>{{ $t('adminEmailCorrections.currentEmail') }}:</strong> {{ req.current_email }}</p>
                    <p class="mb-1"><strong>{{ $t('adminEmailCorrections.requestedEmail') }}:</strong> {{ req.requested_email }}</p>
                    <p class="mb-1"><strong>{{ $t('adminEmailCorrections.reason') }}:</strong> {{ reasonLabel(req.reason) }}</p>
                    <p v-if="req.reason_detail" class="mb-1 text-muted small">{{ req.reason_detail }}</p>
                    <p v-if="req.admin_note" class="mb-1 text-muted small"><strong>{{ $t('adminEmailCorrections.adminNote') }}:</strong> {{ req.admin_note }}</p>

                    <div v-if="req.status === 'pending'" class="mt-3">
                      <div v-if="rejectingId === req.id" class="mb-2">
                        <b-form-textarea v-model="rejectNote" size="sm" :placeholder="$t('adminEmailCorrections.rejectNotePlaceholder')" rows="2" />
                        <div class="d-flex justify-content-end mt-2">
                          <b-button variant="secondary" size="sm" class="me-2" @click="rejectingId = null">{{ $t('common.cancel') }}</b-button>
                          <b-button variant="danger" size="sm" :disabled="processingId === req.id" @click="confirmReject(req)">{{ $t('adminEmailCorrections.confirmReject') }}</b-button>
                        </div>
                      </div>
                      <div v-else class="d-flex justify-content-end">
                        <b-button variant="outline-danger" size="sm" class="me-2" :disabled="processingId === req.id" @click="rejectingId = req.id; rejectNote = ''">
                          {{ $t('adminEmailCorrections.reject') }}
                        </b-button>
                        <b-button variant="success" size="sm" :disabled="processingId === req.id" @click="approve(req)">
                          {{ $t('adminEmailCorrections.approve') }}
                        </b-button>
                      </div>
                    </div>
                  </b-card-body>
                </b-card>
              </b-col>
            </b-row>
            <kadr-empty-state
              v-else
              icon="fas fa-envelope-open-text"
              :title="$t('adminEmailCorrections.noRequests')"
              :description="$t('adminEmailCorrections.noRequestsDescription')"
            />
            <b-pagination
              v-if="total > perPage"
              v-model="currentPage"
              :total-rows="total"
              :per-page="perPage"
              align="center"
              class="mt-3"
              @input="fetchRequests"
            />
          </template>
        </iq-card>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import KadrPageHeader from '../../components/kadr/KadrPageHeader.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'AdminEmailCorrectionsView',
  components: { KadrPageHeader, KadrEmptyState },
  data () {
    return {
      requests: [],
      total: 0,
      currentPage: 1,
      perPage: 20,
      statusFilter: 'pending',
      rejectingId: null,
      rejectNote: '',
      processingId: null
    }
  },
  computed: {
    statusOptions () {
      return [
        { value: 'pending', text: this.$t('adminEmailCorrections.statusPending') },
        { value: 'approved', text: this.$t('adminEmailCorrections.statusApproved') },
        { value: 'rejected', text: this.$t('adminEmailCorrections.statusRejected') },
        { value: '', text: this.$t('adminEmailCorrections.statusAll') }
      ]
    }
  },
  mounted () {
    // Route page (StandardLayout child) — without this, a direct reload or
    // fresh-tab open of this URL leaves StandardLayout's boot #loading
    // overlay stuck forever, since nothing else ever fades it out.
    sofbox.index()
    this.fetchRequests(1)
  },
  methods: {
    formatDate (v) {
      return this.$formatDateTime ? this.$formatDateTime(v) : v
    },
    statusVariant (status) {
      if (status === 'approved') return 'success'
      if (status === 'rejected') return 'secondary'
      return 'warning'
    },
    reasonLabel (reason) {
      if (reason === 'typo') return this.$t('clientCases.reasonTypo')
      if (reason === 'wrong_person') return this.$t('clientCases.reasonWrongPerson')
      return this.$t('clientCases.reasonOther')
    },
    async fetchRequests (page = 1) {
      this.currentPage = page
      const response = await this.$store.dispatch('getEmailCorrectionRequests', {
        page,
        perPage: this.perPage,
        status: this.statusFilter || undefined
      })
      if (response.success) {
        this.requests = response.data.items || []
        this.total = response.data.total || 0
      }
    },
    async approve (req) {
      this.processingId = req.id
      try {
        const response = await this.$store.dispatch('approveEmailCorrectionRequest', { id: req.id })
        if (response.success) this.fetchRequests(this.currentPage)
      } finally {
        this.processingId = null
      }
    },
    async confirmReject (req) {
      this.processingId = req.id
      try {
        const response = await this.$store.dispatch('rejectEmailCorrectionRequest', { id: req.id, adminNote: this.rejectNote })
        if (response.success) {
          this.rejectingId = null
          this.fetchRequests(this.currentPage)
        }
      } finally {
        this.processingId = null
      }
    }
  }
}
</script>
