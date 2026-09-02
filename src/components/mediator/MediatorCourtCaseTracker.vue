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
        size="xl"
        scrollable
        modal-class="court-case-modal"
        content-class="court-case-modal__content"
        body-class="court-case-modal__body"
        hide-header
        @hidden="onModalHidden"
      >
        <div class="court-case-modal__toolbar">
          <div class="court-case-modal__toolbar-left">
            <code v-if="selectedTracker" class="court-case-modal__cnr">{{ selectedTracker.cnr }}</code>
            <span v-if="lastPulledAt" class="court-case-modal__pulled">
              Last pulled on {{ formatDate(lastPulledAt) }}
            </span>
            <span v-else class="court-case-modal__pulled court-case-modal__pulled--muted">
              No saved status yet
            </span>
          </div>
          <button type="button" class="court-case-modal__close" aria-label="Close" @click="detailsVisible = false">
            <i class="ri-close-line" />
          </button>
        </div>

        <div v-if="detailsLoading" class="court-case-modal__loading">
          <b-spinner small class="me-2" />
          Loading saved case data…
        </div>
        <p v-else-if="detailsError" class="text-danger small mb-0 px-1">{{ detailsError }}</p>
        <court-case-details-panel
          v-else-if="caseDetails"
          :details="caseDetails"
          :official-url="caseDetails.officialUrl"
        />
        <p v-else class="text-muted small mb-0 px-1">
          Use &ldquo;Get latest status&rdquo; to fetch case details from eCourts.
        </p>
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
import CourtCaseDetailsPanel from './CourtCaseDetailsPanel.vue'

export default {
  name: 'MediatorCourtCaseTracker',
  components: {
    CourtCaseDetailsPanel
  },
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
  computed: {},
  mounted () {
    this.loadTrackers()
  },
  methods: {
    onCnrInput () {
      this.cnrInput = this.cnrInput.toUpperCase().replace(/[\s-]/g, '')
    },
    formatDate (value) {
      return this.$formatDateTime(value)
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
        if (res.success === false || res.premiumLocked) {
          return
        }
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

.court-case-modal__content {
  border-radius: 12px;
  border: none;
  overflow: hidden;
}

.court-case-modal__body {
  padding: 0 1.25rem 1rem;
  max-height: calc(100vh - 10rem);
}

.court-case-modal__toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 0 0.75rem;
  margin-bottom: 0.25rem;
  border-bottom: 1px solid #ebedf5;
}

.court-case-modal__toolbar-left {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.court-case-modal__cnr {
  font-size: 0.85rem;
  background: #eef2ff;
  color: #2b4ecf;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.court-case-modal__pulled {
  font-size: 0.78rem;
  color: #5a6a8e;
}

.court-case-modal__pulled--muted {
  color: #9aa3bd;
}

.court-case-modal__close {
  background: #f4f6fb;
  border: none;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  color: #4a5472;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.court-case-modal__close:hover {
  background: #e8ecf5;
  color: #1e2640;
}

.court-case-modal__loading {
  display: flex;
  align-items: center;
  padding: 2rem 0;
  color: #5a6a8e;
  font-size: 0.9rem;
}
</style>
