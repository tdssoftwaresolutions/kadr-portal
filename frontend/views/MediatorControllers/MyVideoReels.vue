<template>
  <div class="kadr-animate-in">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
    <iq-card v-if="page === 'HOME'">
      <template v-slot:headerTitle>
        <h4 class="card-title">{{ $t('mediatorTools.reelsTitle') }}</h4>
      </template>
      <template v-slot:headerAction>
        <b-button variant="primary" size="sm" @click="newReel" class="professional-btn">
          <i class="ri-add-line me-1"></i>
          {{ $t('mediatorTools.reelsNewVideo') }}
        </b-button>
      </template>
      <template v-slot:body>
        <b-col md="12">
          <b-row v-if="paginatedData.reels && paginatedData.reels.length > 0">
            <b-col md="4" v-for="reel in paginatedData.reels" :key="reel.id" class="mb-3">
              <b-card class="reel-card h-100">
                <b-card-body class="d-flex flex-column">
                  <div class="mb-2 reel-thumb-wrap">
                    <div v-if="videoIdFromUrl(reel.youtube_url)" class="embed-responsive embed-responsive-16by9 reel-thumb">
                      <iframe
                        class="embed-responsive-item"
                        :src="embedSrc(videoIdFromUrl(reel.youtube_url), false)"
                        title="preview"
                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                        loading="lazy"
                      />
                    </div>
                    <div v-else class="reel-thumb-placeholder">{{ $t('mediatorTools.reelInvalidLink') }}</div>
                  </div>
                  <h5 class="card-title text-truncate">{{ reel.title }}</h5>
                  <p class="text-muted small text-truncate-3">{{ reel.description || '—' }}</p>
                  <small class="text-muted">{{ formatDateTime(reel.created_at) }}</small>
                  <div class="mt-auto d-flex justify-content-between pt-2">
                    <b-button variant="outline-primary" size="sm" @click="onEditReel(reel)">{{ $t('mediatorTools.reelEdit') }}</b-button>
                    <b-button variant="outline-danger" size="sm" @click="deleteReel(reel)">{{ $t('mediatorTools.reelDelete') }}</b-button>
                  </div>
                </b-card-body>
              </b-card>
            </b-col>
          </b-row>
          <div v-else class="text-center py-5">
            <div class="empty-state">
              <i class="ri-movie-2-line empty-icon"></i>
              <h5 class="empty-title">{{ $t('mediatorTools.reelsEmptyTitle') }}</h5>
              <p class="empty-subtitle">{{ $t('mediatorTools.reelsEmptySubtitle') }}</p>
            </div>
          </div>
          <b-pagination
            v-if="paginatedData && paginatedData.total > 0"
            v-model="currentPage"
            :total-rows="paginatedData.total"
            :per-page="perPage"
            align="center"
            class="mt-3"
            @input="fetchReels"
          />
        </b-col>
      </template>
    </iq-card>
    <iq-card v-if="page === 'VIEW_EDIT'">
      <template v-slot:headerTitle>
        <h4 class="card-title">{{ selectedReel.id ? $t('mediatorTools.reelFormEditTitle') : $t('mediatorTools.reelFormNewTitle') }}</h4>
      </template>
      <template v-slot:headerAction>
        <button type="button" class="btn btn-primary" @click="saveReel">{{ $t('mediatorTools.reelSave') }}</button>
        <button type="button" class="btn btn-danger" v-if="selectedReel.id" @click="deleteReel(selectedReel)">{{ $t('mediatorTools.reelDelete') }}</button>
        <button type="button" class="btn btn-outline-secondary" @click="cancel">{{ $t('mediatorTools.reelCancel') }}</button>
      </template>
      <template v-slot:body>
        <div class="row">
          <div class="col-lg-7">
            <div class="mb-3">
              <label for="reel-title" class="form-label fw-semibold">{{ $t('mediatorTools.reelTitleLabel') }}</label>
              <input
                id="reel-title"
                v-model="selectedReel.title"
                type="text"
                class="form-control"
                :placeholder="$t('mediatorTools.reelTitlePlaceholder')"
                maxlength="255"
              />
            </div>
            <div class="mb-3">
              <label for="reel-desc" class="form-label fw-semibold">{{ $t('mediatorTools.reelDescLabel') }}</label>
              <textarea
                id="reel-desc"
                v-model="selectedReel.description"
                class="form-control"
                rows="4"
                :placeholder="$t('mediatorTools.reelDescPlaceholder')"
              />
            </div>
            <div class="mb-3">
              <label for="reel-url" class="form-label fw-semibold">{{ $t('mediatorTools.reelUrlLabel') }}</label>
              <input
                id="reel-url"
                v-model="selectedReel.youtube_url"
                type="url"
                class="form-control"
                :placeholder="$t('mediatorTools.reelUrlPlaceholder')"
                @input="onUrlInput"
              />
              <small class="text-muted">{{ $t('mediatorTools.reelUrlHint') }}</small>
            </div>
            <div class="mb-3 border rounded p-3 bg-light">
              <b-form-checkbox v-model="selectedReel.contentRightsConfirmed" class="mb-0">
                {{ $t('mediatorTools.reelRightsConfirm') }}
              </b-form-checkbox>
            </div>
          </div>
          <div class="col-lg-5">
            <label class="form-label fw-semibold">{{ $t('mediatorTools.reelPreviewLabel') }}</label>
            <div class="preview-panel">
              <div v-if="previewVideoId" class="preview-frame mx-auto">
                <iframe
                  :key="previewVideoId + previewNonce"
                  :src="embedSrc(previewVideoId, false)"
                  title="YouTube preview"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
              <div v-else class="preview-placeholder">
                <i class="ri-youtube-line preview-icon"></i>
                <p>{{ $t('mediatorTools.reelPreviewPlaceholder') }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </iq-card>
  </div>
</template>

<script>
import { sofbox } from '../../config/pluginInit'
import Alert from '../../components/sofbox/alert/Alert.vue'

export default {
  name: 'MyVideoReels',
  components: { Alert },
  mounted () {
    sofbox.index()
    this.fetchReels(1)
  },
  data () {
    return {
      page: 'HOME',
      currentPage: 1,
      perPage: 10,
      paginatedData: { reels: [], total: 0 },
      reelsCache: {},
      previewNonce: 0,
      selectedReel: {
        id: null,
        title: '',
        description: '',
        youtube_url: '',
        contentRightsConfirmed: false
      },
      alert: {
        visible: false,
        message: '',
        timeout: 5000,
        type: 'primary'
      }
    }
  },
  computed: {
    previewVideoId () {
      return this.videoIdFromUrl(this.selectedReel.youtube_url)
    }
  },
  methods: {
    formatDateTime (dateString) {
      return this.$formatDateTime(dateString)
    },
    videoIdFromUrl (input) {
      if (!input || typeof input !== 'string') return null
      const trimmed = input.trim()
      const patterns = [
        /(?:youtube\.com\/watch\?[^#]*[&?]v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
      ]
      for (const p of patterns) {
        const m = trimmed.match(p)
        if (m) return m[1]
      }
      return null
    },
    embedSrc (videoId, autoplay) {
      const q = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' })
      if (autoplay) q.set('autoplay', '1')
      return `https://www.youtube-nocookie.com/embed/${videoId}?${q.toString()}`
    },
    onUrlInput () {
      this.previewNonce++
    },
    showAlert (message, type) {
      this.alert = { message, type, visible: true }
    },
    async fetchReels (newPage, forceRefresh = false) {
      this.currentPage = newPage
      if (!forceRefresh && this.reelsCache[this.currentPage]) {
        this.paginatedData = this.reelsCache[this.currentPage]
        return
      }
      const response = await this.$store.dispatch('getMyVideoReels', { page: this.currentPage })
      if (response.success) {
        this.reelsCache[this.currentPage] = response.data
        this.paginatedData = {
          reels: response.data.reels || [],
          total: response.data.total || 0,
          page: response.data.page,
          perPage: response.data.perPage
        }
      }
    },
    newReel () {
      this.page = 'VIEW_EDIT'
      this.selectedReel = {
        id: null,
        title: '',
        description: '',
        youtube_url: '',
        contentRightsConfirmed: false
      }
    },
    onEditReel (reel) {
      this.page = 'VIEW_EDIT'
      this.selectedReel = {
        id: reel.id,
        title: reel.title,
        description: reel.description || '',
        youtube_url: reel.youtube_url,
        contentRightsConfirmed: false
      }
    },
    cancel () {
      this.page = 'HOME'
    },
    async saveReel () {
      if (!this.selectedReel.title || !this.selectedReel.title.trim()) {
        this.showAlert(this.$t('mediatorTools.reelTitleRequired'), 'danger')
        return
      }
      if (!this.previewVideoId) {
        this.showAlert(this.$t('mediatorTools.reelUrlInvalid'), 'danger')
        return
      }
      if (!this.selectedReel.contentRightsConfirmed) {
        this.showAlert(this.$t('mediatorTools.reelRightsRequired'), 'danger')
        return
      }
      const response = await this.$store.dispatch('saveVideoReel', {
        reel: {
          id: this.selectedReel.id,
          title: this.selectedReel.title.trim(),
          description: (this.selectedReel.description || '').trim(),
          youtube_url: this.selectedReel.youtube_url.trim(),
          contentRightsConfirmed: true
        }
      })
      if (response.success) {
        const saved = response.data.reel
        this.showAlert(this.$t('mediatorTools.reelSaved'), 'success')
        this.reelsCache = {}
        await this.fetchReels(this.currentPage, true)
        this.cancel()
        if (saved && saved.id) {
          /* list refreshed */
        }
      }
    },
    async deleteReel (reel) {
      if (!reel || !reel.id) return
      if (!confirm(this.$t('mediatorTools.reelDeleteConfirm'))) return
      const response = await this.$store.dispatch('deleteVideoReel', reel.id)
      if (response.success) {
        this.reelsCache = {}
        await this.fetchReels(this.currentPage, true)
        this.showAlert(this.$t('mediatorTools.reelDeleted'), 'success')
        if (this.page === 'VIEW_EDIT') this.cancel()
      }
    }
  }
}
</script>

<style scoped>
.reel-card {
  border: 1px solid var(--kadr-border);
  border-radius: 8px;
  background: var(--kadr-bg-surface);
  box-shadow: var(--kadr-shadow-sm);
}
.reel-thumb-wrap {
  border-radius: 8px;
  overflow: hidden;
  background: #111;
}
.reel-thumb iframe {
  border: 0;
}
.reel-thumb-placeholder {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--kadr-text-muted);
  font-size: 13px;
  background: var(--kadr-surface-muted);
}
.text-truncate-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.empty-icon {
  font-size: 48px;
  color: var(--kadr-text-label);
}
.preview-panel {
  background: var(--kadr-surface-muted);
  border: 1px solid var(--kadr-border);
  border-radius: 12px;
  padding: 16px;
  min-height: 280px;
}
.preview-frame {
  max-width: 280px;
  width: 100%;
  aspect-ratio: 9 / 16;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  background: #000;
}
.preview-frame iframe {
  border: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.preview-placeholder {
  text-align: center;
  padding: 40px 16px;
  color: var(--kadr-text-muted);
  font-size: 14px;
}
.preview-icon {
  font-size: 42px;
  display: block;
  margin-bottom: 12px;
  color: var(--kadr-danger);
}
</style>
