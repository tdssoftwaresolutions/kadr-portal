<template>
  <iq-card class="workspace-card court-tracker-card mediator-tool-card">
    <template v-slot:headerTitle>
      <h4 class="card-title mb-0">Court case tracker</h4>
    </template>
    <template v-slot:body>
      <div class="mediator-tool-card__inner">
        <b-form @submit.prevent="onTrack" class="tracker-form mb-2">
          <b-row>
            <b-col cols="12" md="5" class="mb-2 mb-md-0">
              <b-form-input
                v-model="cnrInput"
                size="sm"
                placeholder="CNR (16 chars)"
                maxlength="16"
                :disabled="submitting"
                @input="onCnrInput"
              />
            </b-col>
            <b-col cols="12" md="4" class="mb-2 mb-md-0">
              <b-form-input
                v-model="labelInput"
                size="sm"
                placeholder="Label (optional)"
                maxlength="120"
                :disabled="submitting"
              />
            </b-col>
            <b-col cols="12" md="3">
              <b-button
                type="submit"
                variant="primary"
                size="sm"
                block
                :disabled="submitting || cnrInput.length !== 16"
              >
                Add case
              </b-button>
            </b-col>
          </b-row>
        </b-form>

        <div class="mediator-tool-card__scroll">
          <p v-if="loading" class="text-muted small mb-0">Loading saved cases…</p>

          <div v-else-if="trackers.length === 0" class="empty-data mb-0">
            No cases saved yet.
          </div>

          <ul v-else class="tracker-list mb-0">
            <li
              v-for="item in trackers"
              :key="item.id"
              class="tracker-item tracker-item--clickable"
              @click="openDetails(item)"
            >
              <div class="tracker-item-main">
                <span class="case-cnr">{{ item.cnr }}</span>
                <p v-if="item.caseTitle" class="case-line case-line--title mb-0">{{ item.caseTitle }}</p>
                <p v-if="item.courtName" class="case-line case-line--court mb-0">
                  in {{ item.courtName }}
                </p>
                <p v-if="item.caseStatus || item.label" class="case-line case-line--status mb-0">
                  <span v-if="item.caseStatus" class="status-badge">{{ item.caseStatus }}</span>
                  <span v-if="item.label" class="tracker-label">{{ item.label }}</span>
                </p>
              </div>
              <b-button
                size="sm"
                variant="link"
                class="p-0 text-danger tracker-remove-btn"
                title="Remove"
                @click.stop="onRemove(item)"
              >
                <i class="ri-delete-bin-line" />
              </b-button>
            </li>
          </ul>
        </div>
      </div>

      <b-modal
        v-model="detailsVisible"
        size="lg"
        scrollable
        :title="modalTitle"
        @hidden="onModalHidden"
      >
        <p v-if="detailsLoading" class="text-muted small mb-0">Loading saved case data…</p>
        <p v-else-if="detailsError" class="text-danger small mb-0">{{ detailsError }}</p>
        <template v-else>
          <p v-if="lastPulledAt" class="small text-muted mb-3">
            Last pulled on {{ formatDate(lastPulledAt) }}
          </p>
          <p v-else class="small text-muted mb-3">
            No saved status yet. Use &ldquo;Get latest status&rdquo; to fetch from eCourts.
          </p>

          <template v-if="caseDetails">
            <p v-if="caseDetails.caseTitle" class="font-weight-bold mb-2">{{ caseDetails.caseTitle }}</p>
            <p v-if="caseDetails.caseStatus" class="small mb-2">
              <strong>Status:</strong> {{ caseDetails.caseStatus }}
              <span v-if="caseDetails.courtName" class="text-muted"> · {{ caseDetails.courtName }}</span>
            </p>
            <p class="small text-muted mb-2">CNR: <code>{{ caseDetails.cnr }}</code></p>

            <dl v-if="detailRows.length" class="case-details-dl small mb-3">
              <div v-for="(row, idx) in detailRows" :key="'row-' + idx" class="case-details-row">
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
              </div>
            </dl>

            <div v-if="hearingRows.length" class="hearing-block">
              <h6 class="small font-weight-bold mb-2">Hearing history</h6>
              <div class="table-responsive">
                <table class="table table-sm table-bordered hearing-table mb-0">
                  <thead>
                    <tr>
                      <th>Judge</th>
                      <th>Business date</th>
                      <th>Hearing date</th>
                      <th>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(h, hIdx) in hearingRows" :key="'h-' + hIdx">
                      <td>{{ h.judge }}</td>
                      <td>{{ h.businessOnDate }}</td>
                      <td>{{ h.hearingDate }}</td>
                      <td>{{ h.purposeOfListing }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
        </template>
        <template v-slot:modal-footer>
          <b-button
            size="sm"
            variant="primary"
            :disabled="syncingLatest || !selectedTracker"
            @click="onGetLatestStatus"
          >
            <span v-if="syncingLatest">Fetching…</span>
            <span v-else>Get latest status</span>
          </b-button>
          <b-button size="sm" variant="secondary" @click="detailsVisible = false">Close</b-button>
        </template>
      </b-modal>
    </template>
  </iq-card>
</template>

<script>
export default {
  name: 'MediatorCourtCaseTracker',
  data () {
    return {
      loading: true,
      submitting: false,
      syncingLatest: false,
      trackers: [],
      cnrInput: '',
      labelInput: '',
      detailsVisible: false,
      detailsLoading: false,
      detailsError: '',
      selectedTracker: null,
      caseDetails: null,
      lastPulledAt: null
    }
  },
  computed: {
    modalTitle () {
      if (!this.selectedTracker) return 'Case details'
      return this.selectedTracker.cnr
    },
    detailRows () {
      if (!this.caseDetails || !Array.isArray(this.caseDetails.caseDetails)) return []
      return this.caseDetails.caseDetails
    },
    hearingRows () {
      if (!this.caseDetails || !Array.isArray(this.caseDetails.hearingHistory)) return []
      return this.caseDetails.hearingHistory
    }
  },
  mounted () {
    this.loadTrackers()
  },
  methods: {
    onCnrInput () {
      this.cnrInput = this.cnrInput.toUpperCase().replace(/[\s-]/g, '')
    },
    formatDate (value) {
      if (!value) return ''
      return new Date(value).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    unwrap (res) {
      if (!res || res.success === false) return null
      if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
        return res.data
      }
      return res
    },
    normalizeRow (row) {
      return {
        id: row.id,
        cnr: row.cnr,
        label: row.label,
        caseTitle: row.caseTitle || row.case_title || null,
        courtName: row.courtName || row.court_name || null,
        caseStatus: row.caseStatus || row.case_status || null,
        lastFetchedAt: row.lastFetchedAt || row.last_fetched_at,
        updatedAt: row.updatedAt || row.updated_at,
        hasSnapshot: row.hasSnapshot === true
      }
    },
    applyDetailsPayload (payload) {
      if (!payload) return
      if (payload.tracker) {
        const tracker = this.normalizeRow(payload.tracker)
        const idx = this.trackers.findIndex((t) => t.id === tracker.id)
        if (idx >= 0) {
          this.$set(this.trackers, idx, tracker)
        }
        if (this.selectedTracker && this.selectedTracker.id === tracker.id) {
          this.selectedTracker = this.trackers[idx] || tracker
        }
        this.lastPulledAt = tracker.lastFetchedAt || tracker.updatedAt
      }
      if (payload.details) {
        this.caseDetails = payload.details
      }
    },
    async loadTrackers () {
      this.loading = true
      try {
        const res = await this.$store.dispatch('getMediatorCourtCaseTrackers')
        const payload = this.unwrap(res)
        const rows = (payload && payload.trackers) || []
        this.trackers = rows.map((r) => this.normalizeRow(r))
      } finally {
        this.loading = false
      }
    },
    async onTrack () {
      if (this.cnrInput.length !== 16) return
      this.submitting = true
      try {
        const res = await this.$store.dispatch('addMediatorCourtCaseTracker', {
          cnr: this.cnrInput,
          label: this.labelInput.trim() || undefined
        })
        const payload = this.unwrap(res)
        if (payload && payload.tracker) {
          const tracker = this.normalizeRow(payload.tracker)
          this.trackers = [tracker].concat(this.trackers.filter((t) => t.id !== tracker.id))
          this.cnrInput = ''
          this.labelInput = ''
        }
      } finally {
        this.submitting = false
      }
    },
    async onRemove (item) {
      if (!window.confirm('Remove ' + item.cnr + ' from your tracker?')) return
      const res = await this.$store.dispatch('removeMediatorCourtCaseTracker', { id: item.id })
      if (res && res.success !== false) {
        this.trackers = this.trackers.filter((t) => t.id !== item.id)
        if (this.selectedTracker && this.selectedTracker.id === item.id) {
          this.detailsVisible = false
        }
      }
    },
    openDetails (item) {
      this.selectedTracker = item
      this.caseDetails = null
      this.detailsError = ''
      this.lastPulledAt = item.lastFetchedAt || item.updatedAt || null
      this.detailsVisible = true
      this.loadSavedDetails(item.id)
    },
    onModalHidden () {
      this.selectedTracker = null
      this.caseDetails = null
      this.detailsError = ''
      this.detailsLoading = false
      this.syncingLatest = false
      this.lastPulledAt = null
    },
    async loadSavedDetails (id) {
      this.detailsLoading = true
      this.detailsError = ''
      try {
        const res = await this.$store.dispatch('getMediatorCourtCaseDetails', { id })
        const payload = this.unwrap(res)
        if (!payload) {
          this.detailsError = 'Could not load case details.'
          return
        }
        this.applyDetailsPayload(payload)
        if (!this.caseDetails) {
          this.detailsError = ''
        }
      } catch (err) {
        this.detailsError = err.message || 'Could not load case details.'
      } finally {
        this.detailsLoading = false
      }
    },
    async onGetLatestStatus () {
      if (!this.selectedTracker) return
      this.syncingLatest = true
      this.detailsError = ''
      try {
        const res = await this.$store.dispatch('refreshMediatorCourtCaseTracker', {
          id: this.selectedTracker.id
        })
        const payload = this.unwrap(res)
        if (!payload || !payload.details) {
          this.detailsError = 'Could not fetch latest status from eCourts.'
          return
        }
        this.applyDetailsPayload(payload)
      } catch (err) {
        this.detailsError = err.message || 'Could not fetch latest status.'
      } finally {
        this.syncingLatest = false
      }
    }
  }
}
</script>

<style scoped>
.court-tracker-card {
  border-radius: 14px;
  height: 35rem;
  overflow: scroll;
}

.tracker-form {
  flex-shrink: 0;
}

.tracker-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tracker-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid #ebedf5;
}

.tracker-item--clickable {
  cursor: pointer;
}

.tracker-item--clickable:hover {
  background: #f8f9fd;
  margin-left: -0.35rem;
  margin-right: -0.35rem;
  padding-left: 0.35rem;
  padding-right: 0.35rem;
  border-radius: 6px;
}

.tracker-item:last-child {
  border-bottom: none;
}

.case-cnr {
  font-weight: 600;
  color: #2b4ecf;
  font-size: 0.9rem;
  font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.case-line {
  font-size: 0.8rem;
  line-height: 1.35;
  color: #4a5472;
}

.case-line--title {
  color: #1e2640;
  margin-top: 0.15rem;
}

.case-line--court {
  font-style: italic;
}

.status-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  background: #eef2ff;
  color: #2b4ecf;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  margin-right: 0.35rem;
}

.tracker-label {
  font-size: 0.75rem;
  color: #7c86a7;
}

.tracker-remove-btn {
  flex-shrink: 0;
}

.case-details-dl {
  margin: 0;
}

.case-details-row {
  display: grid;
  grid-template-columns: minmax(110px, 36%) 1fr;
  gap: 0.2rem 0.6rem;
}

.case-details-dl dt {
  font-weight: 600;
  color: #4a5472;
  margin: 0;
}

.case-details-dl dd {
  margin: 0;
  color: #1e2640;
}

.hearing-table {
  font-size: 0.78rem;
}

.hearing-table th {
  background: #f4f6fb;
  white-space: nowrap;
}

.empty-data {
  text-align: center;
  color: #7c86a7;
  padding: 0.8rem 0.5rem;
  border: 1px dashed #d8dded;
  border-radius: 8px;
  font-size: 0.85rem;
}
</style>

<style>
.mediator-tool-card >>> .iq-card-body {
  height: 320px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

.mediator-tool-card__inner {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.mediator-tool-card__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
