<template>
  <div class="case-details-panel">
    <header class="case-details-panel__header">
      <h2 class="case-details-panel__title">{{ displayTitle }}</h2>
      <div class="case-details-panel__meta">
        <div v-if="profile.courtName" class="meta-item">
          <span class="meta-label"><i class="ri-building-2-line" /> Court</span>
          <span class="meta-value">{{ profile.courtName }}</span>
        </div>
        <div v-if="profile.judge" class="meta-item">
          <span class="meta-label"><i class="ri-scales-3-line" /> Judge</span>
          <span class="meta-value">{{ profile.judge }}</span>
        </div>
        <div v-if="profile.caseType" class="meta-item">
          <span class="meta-label"><i class="ri-file-list-3-line" /> Case Type</span>
          <span class="meta-value">{{ profile.caseType }}</span>
        </div>
        <div v-if="profile.registrationNumber" class="meta-item">
          <span class="meta-label">Registration No</span>
          <span class="meta-value">{{ profile.registrationNumber }}</span>
        </div>
        <div v-if="profile.filingNumber" class="meta-item">
          <span class="meta-label">Filing No</span>
          <span class="meta-value">{{ profile.filingNumber }}</span>
        </div>
        <div v-if="profile.cnr" class="meta-item">
          <span class="meta-label">CNR</span>
          <span class="meta-value meta-value--cnr">{{ profile.cnr }}</span>
        </div>
        <div v-if="profile.caseCategory" class="meta-item meta-item--wide">
          <span class="meta-label">Case Category</span>
          <span class="meta-value">{{ profile.caseCategory }}</span>
        </div>
      </div>
      <a
        v-if="orders.length"
        href="#case-orders-section"
        class="case-details-panel__orders-link"
        @click.prevent="scrollToOrders"
      >
        View Orders <i class="ri-arrow-down-s-line" />
      </a>
    </header>

    <section class="case-section">
      <h3 class="case-section__title">
        <i class="ri-scales-3-line" /> Parties &amp; Advocates
      </h3>
      <div class="parties-grid">
        <div class="parties-col">
          <div class="party-block">
            <h4 class="party-block__label"><i class="ri-user-line" /> Petitioner</h4>
            <ul v-if="parties.petitioners.length" class="party-list">
              <li v-for="(name, i) in parties.petitioners" :key="'p-' + i" class="party-chip">
                <span class="party-chip__num">{{ i + 1 }}</span> {{ name }}
              </li>
            </ul>
            <p v-else class="party-empty">—</p>
          </div>
          <div class="party-block">
            <h4 class="party-block__label"><i class="ri-briefcase-line" /> Petitioner Advocate</h4>
            <ul v-if="parties.petitionerAdvocates.length" class="party-list">
              <li
                v-for="(name, i) in parties.petitionerAdvocates"
                :key="'pa-' + i"
                class="party-chip"
              >
                <span class="party-chip__num">{{ i + 1 }}</span> {{ name }}
              </li>
            </ul>
            <p v-else class="party-empty">—</p>
          </div>
        </div>
        <div class="parties-col">
          <div class="party-block">
            <h4 class="party-block__label"><i class="ri-group-line" /> Respondents</h4>
            <ul v-if="parties.respondents.length" class="party-list">
              <li v-for="(name, i) in parties.respondents" :key="'r-' + i" class="party-chip">
                <span class="party-chip__num">{{ i + 1 }}</span> {{ name }}
              </li>
            </ul>
            <p v-else class="party-empty">—</p>
          </div>
          <div v-if="parties.respondentAdvocates.length" class="party-block">
            <h4 class="party-block__label"><i class="ri-briefcase-line" /> Respondent Advocate</h4>
            <ul class="party-list">
              <li
                v-for="(name, i) in parties.respondentAdvocates"
                :key="'ra-' + i"
                class="party-chip"
              >
                <span class="party-chip__num">{{ i + 1 }}</span> {{ name }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section id="case-orders-section" class="case-section">
      <h3 class="case-section__title">
        <i class="ri-time-line" /> Case History with Orders
      </h3>

      <div v-if="finalStatus" class="timeline-final">
        <div class="timeline-final__icon"><i class="ri-hammer-line" /></div>
        <div>
          <strong>{{ finalStatus.title }}</strong>
          <span class="timeline-final__badge">Final Status</span>
        </div>
      </div>

      <div v-if="timeline.length === 0" class="timeline-empty">
        No hearing history recorded for this case.
      </div>

      <ol v-else class="timeline">
        <li v-for="(entry, idx) in timeline" :key="'tl-' + idx" class="timeline-row">
          <div class="timeline-axis">
            <span class="timeline-dot" :class="{ 'timeline-dot--order': entry.orders.length }">
              <i :class="entry.orders.length ? 'ri-scales-3-line' : 'ri-time-line'" />
            </span>
            <span v-if="idx < timeline.length - 1" class="timeline-line" />
          </div>
          <div class="timeline-content">
            <div class="timeline-hearing">
              <p class="timeline-date">{{ formatDisplayDate(entry.date) }}</p>
              <p class="timeline-purpose">
                <i class="ri-file-text-line" /> {{ entry.purpose }}
              </p>
              <p v-if="entry.judge" class="timeline-judge">
                <i class="ri-hammer-line" /> {{ entry.judge }}
              </p>
            </div>
            <div v-if="entry.orders.length" class="timeline-orders">
              <article
                v-for="order in entry.orders"
                :key="order.id"
                class="order-card"
              >
                <div class="order-card__body">
                  <p class="order-card__title">
                    <i class="ri-file-text-line" />
                    {{ orderTitle(order) }}
                  </p>
                  <p class="order-card__sub">{{ order.orderType || 'Copy of Order' }}</p>
                </div>
                <a
                  v-if="orderLink(order)"
                  :href="orderLink(order)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="order-card__btn"
                >
                  View <i class="ri-external-link-line" />
                </a>
                <span v-else class="order-card__btn order-card__btn--muted">View</span>
              </article>
            </div>
          </div>
        </li>
      </ol>
    </section>
  </div>
</template>

<script>
export default {
  name: 'CourtCaseDetailsPanel',
  props: {
    details: {
      type: Object,
      required: true
    },
    officialUrl: {
      type: String,
      default: 'https://services.ecourts.gov.in/ecourtindia_v6/'
    }
  },
  computed: {
    displayTitle () {
      if (this.details.caseTitle) return this.details.caseTitle
      const p = this.parties.petitioners[0] || 'Petitioner'
      const r = this.parties.respondents[0] || 'Respondent'
      return `${p} vs ${r}`
    },
    profile () {
      if (this.details.profile && typeof this.details.profile === 'object') {
        return this.details.profile
      }
      return {
        courtName: this.details.courtName,
        caseType: this.fieldFromDetails('Case type'),
        registrationNumber: this.fieldFromDetails('Registration number'),
        filingNumber: this.fieldFromDetails('Filing number'),
        cnr: this.details.cnr,
        caseCategory: null,
        caseStatus: this.details.caseStatus,
        disposalType: this.fieldFromDetails('Disposal type'),
        decisionDate: this.fieldFromDetails('Decision date')
      }
    },
    parties () {
      if (this.details.parties && typeof this.details.parties === 'object') {
        return {
          petitioners: this.details.parties.petitioners || [],
          petitionerAdvocates: this.details.parties.petitionerAdvocates || [],
          respondents: this.details.parties.respondents || [],
          respondentAdvocates: this.details.parties.respondentAdvocates || []
        }
      }
      return {
        petitioners: this.splitList(this.fieldFromDetails('Petitioner(s)')),
        petitionerAdvocates: this.splitList(this.fieldFromDetails('Petitioner advocate(s)')),
        respondents: this.splitList(this.fieldFromDetails('Respondent(s)')),
        respondentAdvocates: this.splitList(this.fieldFromDetails('Respondent advocate(s)'))
      }
    },
    orders () {
      return Array.isArray(this.details.orders) ? this.details.orders : []
    },
    finalStatus () {
      const status = (this.profile.caseStatus || '').toUpperCase()
      if (!status || (status !== 'DISPOSED' && status !== 'CLOSED')) return null
      const date = this.profile.decisionDate
      const disposal = this.profile.disposalType || status
      const title = date
        ? `${this.formatStatusLabel(disposal)} — ${this.formatDisplayDate(date)}`
        : this.formatStatusLabel(disposal)
      return { title }
    },
    timeline () {
      const hearings = Array.isArray(this.details.hearingHistory)
        ? this.details.hearingHistory.slice()
        : []
      const ordersByDate = {}
      this.orders.forEach((o) => {
        const d = o.orderDate
        if (!d) return
        if (!ordersByDate[d]) ordersByDate[d] = []
        ordersByDate[d].push(o)
      })

      const entries = hearings.map((h) => {
        const date = h.hearingDate || h.businessOnDate
        return {
          date,
          sortKey: date ? new Date(date).getTime() : 0,
          purpose: h.purposeOfListing || '—',
          judge: h.judge || null,
          orders: date && ordersByDate[date] ? ordersByDate[date] : []
        }
      })

      entries.sort((a, b) => b.sortKey - a.sortKey)

      const usedOrderDates = new Set()
      entries.forEach((e) => {
        if (e.date) usedOrderDates.add(e.date)
      })

      this.orders.forEach((o) => {
        if (!o.orderDate || usedOrderDates.has(o.orderDate)) return
        entries.push({
          date: o.orderDate,
          sortKey: new Date(o.orderDate).getTime(),
          purpose: 'Order',
          judge: null,
          orders: [o]
        })
      })

      entries.sort((a, b) => b.sortKey - a.sortKey)
      return entries.filter((e) => e.date)
    }
  },
  methods: {
    fieldFromDetails (label) {
      const rows = this.details.caseDetails || []
      const row = rows.find((r) => r.label === label)
      return row ? row.value : null
    },
    splitList (value) {
      if (!value || value === '—') return []
      return String(value).split(',').map((s) => s.trim()).filter(Boolean)
    },
    formatDisplayDate (value) {
      if (!value || value === '—') return '—'
      return this.$formatDate(value)
    },
    formatStatusLabel (value) {
      if (!value) return 'Disposed'
      return String(value)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    },
    orderTitle (order) {
      const date = order.orderDate ? this.formatDisplayDate(order.orderDate) : ''
      const idx = this.orders.indexOf(order) + 1
      return date ? `Order(${idx}) — ${date}` : `Order(${idx})`
    },
    orderLink (order) {
      if (!order.orderUrl) return null
      const url = String(order.orderUrl)
      if (url.startsWith('http')) return url
      return this.officialUrl
    },
    scrollToOrders () {
      const el = document.getElementById('case-orders-section')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}
</script>

<style scoped>
.case-details-panel {
  color: var(--kadr-text-primary);
  font-size: 0.9rem;
}

.case-details-panel__header {
  position: relative;
  padding-bottom: 1rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--kadr-border-info);
}

.case-details-panel__title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--kadr-text-primary);
  margin: 0 0 1rem;
  line-height: 1.3;
  padding-right: 6rem;
}

.case-details-panel__meta {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.65rem 1.25rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.meta-item--wide {
  grid-column: 1 / -1;
}

.meta-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--kadr-primary);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.meta-label i {
  margin-right: 0.2rem;
  font-size: 0.85rem;
  vertical-align: -1px;
}

.meta-value {
  font-size: 0.88rem;
  color: var(--kadr-text-secondary);
  line-height: 1.35;
}

.meta-value--cnr {
  font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
}

.case-details-panel__orders-link {
  position: absolute;
  top: 0;
  right: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--kadr-primary);
  text-decoration: none;
}

.case-details-panel__orders-link:hover {
  color: var(--kadr-primary-hover);
  text-decoration: none;
}

.case-section {
  margin-bottom: 1.5rem;
}

.case-section__title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--kadr-text-primary);
  margin: 0 0 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.case-section__title i {
  color: var(--kadr-primary);
  font-size: 1.1rem;
}

.parties-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

@media (max-width: 576px) {
  .parties-grid {
    grid-template-columns: 1fr;
  }
}

.party-block {
  margin-bottom: 0.85rem;
}

.party-block__label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--kadr-primary);
  margin: 0 0 0.45rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.party-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.party-chip {
  background: var(--kadr-surface-muted);
  border: 1px solid var(--kadr-border-info);
  border-radius: 8px;
  padding: 0.45rem 0.65rem;
  font-size: 0.85rem;
  color: var(--kadr-text-secondary);
}

.party-chip__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.35rem;
  background: var(--kadr-bg-surface);
  border: 1px solid var(--kadr-border-strong);
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--kadr-primary);
}

.party-empty {
  margin: 0;
  color: var(--kadr-text-muted);
  font-size: 0.85rem;
}

.timeline-final {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  margin-left: 2.5rem;
  background: linear-gradient(90deg, var(--kadr-status-success-bg) 0%, var(--kadr-surface-muted) 100%);
  border: 1px solid var(--kadr-status-success-bg);
  border-radius: 10px;
  color: var(--kadr-status-success-text);
}

.timeline-final__icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--kadr-bg-surface);
  border: 2px solid var(--kadr-success);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.timeline-final__badge {
  display: inline-block;
  margin-left: 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  background: var(--kadr-bg-surface);
  border: 1px solid var(--kadr-status-success-bg);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
}

.timeline-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0;
}

.timeline-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 2rem;
  flex-shrink: 0;
}

.timeline-dot {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--kadr-bg-surface);
  border: 2px solid var(--kadr-primary);
  color: var(--kadr-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  z-index: 1;
}

.timeline-dot--order {
  border-color: var(--kadr-primary);
  color: var(--kadr-primary);
}

.timeline-line {
  flex: 1;
  width: 2px;
  min-height: 1rem;
  background: var(--kadr-primary-soft-border);
  margin: 0.15rem 0;
}

.timeline-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding-bottom: 1.25rem;
  min-width: 0;
}

@media (max-width: 768px) {
  .timeline-content {
    grid-template-columns: 1fr;
  }
}

.timeline-hearing {
  background: var(--kadr-bg-surface);
  border: 1px solid var(--kadr-border-info);
  border-left: 4px solid var(--kadr-text-primary);
  border-radius: 8px;
  padding: 0.65rem 0.85rem;
}

.timeline-date {
  font-weight: 700;
  color: var(--kadr-primary);
  font-size: 0.95rem;
  margin: 0 0 0.35rem;
}

.timeline-purpose,
.timeline-judge {
  margin: 0 0 0.25rem;
  font-size: 0.82rem;
  color: var(--kadr-text-secondary);
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
}

.timeline-purpose i,
.timeline-judge i {
  color: var(--kadr-primary);
  margin-top: 0.1rem;
}

.timeline-orders {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.order-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--kadr-primary-soft) 0%, var(--kadr-surface-info) 100%);
  border: 1px solid var(--kadr-primary-soft-border);
  border-left: 4px solid var(--kadr-primary);
  border-radius: 8px;
  padding: 0.55rem 0.75rem;
}

.order-card__title {
  font-weight: 600;
  font-size: 0.82rem;
  color: var(--kadr-text-primary);
  margin: 0 0 0.15rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.order-card__sub {
  margin: 0;
  font-size: 0.75rem;
  color: var(--kadr-text-muted);
}

.order-card__btn {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--kadr-primary);
  border: 1px solid var(--kadr-primary);
  border-radius: 6px;
  padding: 0.25rem 0.55rem;
  text-decoration: none;
  white-space: nowrap;
}

.order-card__btn:hover {
  background: var(--kadr-primary);
  color: var(--kadr-text-on-primary);
  text-decoration: none;
}

.order-card__btn--muted {
  opacity: 0.45;
  pointer-events: none;
  border-color: var(--kadr-border-strong);
  color: var(--kadr-text-muted);
}

.timeline-empty {
  text-align: center;
  color: var(--kadr-text-muted);
  padding: 1rem;
  background: var(--kadr-surface-muted);
  border-radius: 8px;
  font-size: 0.85rem;
}
</style>
