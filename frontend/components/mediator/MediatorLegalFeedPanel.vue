<template>
  <iq-card class="workspace-card legal-feed-card mediator-tool-card">
    <template v-slot:headerTitle>
      <h4 class="card-title mb-0">Legal pulse</h4>
    </template>
    <template v-slot:body>
      <div class="mediator-tool-card__inner">
        <b-form-group label="Court feed" label-size="sm" class="mb-2 feed-select-wrap">
          <b-form-select
            v-model="selectedFeed"
            size="sm"
            :options="feedOptions"
            :disabled="loading"
            @change="onFeedChange"
          />
        </b-form-group>

        <div class="mediator-tool-card__scroll">
          <p v-if="loadError" class="text-danger small mb-2">{{ loadError }}</p>
          <p v-if="loading" class="text-muted small mb-2">Loading articles…</p>

          <template v-else>
            <p v-if="feedItems.length > 0" class="small text-muted mb-2">
              {{ feedItems.length }} article(s)
            </p>
            <ul v-if="feedItems.length > 0" class="feed-list mb-0">
              <li v-for="(item, index) in feedItems" :key="item.link || ('item-' + index)" class="feed-item">
                <a :href="item.link" target="_blank" rel="noopener noreferrer" class="feed-title">
                  {{ item.title }}
                </a>
                <p v-if="item.summary" class="feed-summary small text-muted mb-0">{{ item.summary }}</p>
              </li>
            </ul>
            <div v-else class="empty-data mb-0">
              No articles for this feed right now.
            </div>
          </template>
        </div>
      </div>
    </template>
  </iq-card>
</template>

<script>
const FEED_OPTIONS = [
  { value: 'judgments', text: 'Latest judgments (all courts)' },
  { value: 'delhi', text: 'Delhi High Court' },
  { value: 'bombay', text: 'Bombay High Court' },
  { value: 'kolkata', text: 'Calcutta High Court' },
  { value: 'chennai', text: 'Madras High Court' },
  { value: 'karnataka', text: 'Karnataka High Court' },
  { value: 'kerala', text: 'Kerala High Court' },
  { value: 'allahabad', text: 'Allahabad High Court' }
]

export default {
  name: 'MediatorLegalFeedPanel',
  data () {
    return {
      loading: false,
      loadError: '',
      selectedFeed: 'judgments',
      feedOptions: FEED_OPTIONS,
      feedItems: [],
      feedTitle: ''
    }
  },
  mounted () {
    this.loadFeed()
  },
  methods: {
    onFeedChange () {
      this.loadFeed()
    },
    extractItems (res) {
      if (!res) return []
      if (res.success === false) return []
      if (Array.isArray(res.items)) return res.items
      if (res.data && Array.isArray(res.data.items)) return res.data.items
      return []
    },
    extractTitle (res) {
      if (!res) return ''
      if (res.feedTitle) return res.feedTitle
      if (res.data && res.data.feedTitle) return res.data.feedTitle
      return 'Court Judgments'
    },
    async loadFeed () {
      this.loading = true
      this.loadError = ''
      this.feedItems = []
      try {
        const res = await this.$store.dispatch('getMediatorLegalFeeds', {
          feed: this.selectedFeed,
          limit: 12
        })
        if (!res || res.success === false) {
          this.loadError = (res && res.error && res.error.message) || 'Could not load feed.'
          return
        }
        const items = this.extractItems(res)
        this.feedTitle = this.extractTitle(res)
        this.feedItems = items
      } catch (err) {
        this.loadError = err.message || 'Could not load feed.'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.legal-feed-card {
  border-radius: 14px;
  height: 35rem;
  overflow: scroll;
}

.feed-select-wrap {
  flex-shrink: 0;
}

.feed-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.feed-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--kadr-border-info);
}

.feed-item:last-child {
  border-bottom: none;
}

.feed-title {
  font-weight: 600;
  color: var(--kadr-primary);
  display: block;
  line-height: 1.35;
  margin-bottom: 0.2rem;
  font-size: 0.85rem;
}

.feed-title:hover {
  color: var(--kadr-primary-hover);
  text-decoration: none;
}

.feed-summary {
  line-height: 1.35;
  font-size: 0.78rem;
}

.empty-data {
  text-align: center;
  color: var(--kadr-text-muted);
  padding: 0.8rem 0.5rem;
  border: 1px dashed var(--kadr-border-strong);
  border-radius: 8px;
  font-size: 0.85rem;
}
</style>
