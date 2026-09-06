<template>
  <b-container fluid class="dashboard-client-page kadr-animate-in">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>

    <kadr-dashboard-hero
      :name="user.name"
      :email="user.email"
      :avatar-url="avatarUrl"
      :stats="heroStats"
    />
    <div class="workspace-grid">
      <iq-card class="workspace-card">
        <template v-slot:headerTitle>
          <h4 class="card-title">{{ $t('mediatorDashboard.todaysSchedule') }}</h4>
        </template>
        <template v-slot:body>
          <div v-if="todaysEvents.length" class="list-scroll">
            <template v-for="(event, index) in todaysEvents" >
              <div
                :key="index"
                v-if="event != null"
                class="schedule-item">
                <div class="schedule-main" >
                  <i class="ri-checkbox-blank-circle-fill schedule-dot" :style="{ color: kadrEventColor }" v-if="event.type == 'KADR'"></i>
                  <i class="ri-checkbox-blank-circle-fill schedule-dot" :style="{ color: personalEventColor }" v-else></i>
                  <div class="schedule-text" v-if="event.type == 'KADR'">
                    <h6>{{ $t('mediatorDashboard.caseNumber', { id: event.caseId || event.caseNumber || '-' }) }}</h6>
                    <p>{{ event.caseFirstPartyName || event.firstPartyName || '-' }} {{ $t('mediatorDashboard.vs') }} {{ event.caseSecondPartyName || event.secondPartyName || '-' }}</p>
                    <span>{{ formatDate(event.start_datetime || event.startDate) }} - {{ formatDate(event.end_datetime || event.endDate) }}</span>
                  </div>
                   <div class="schedule-text" v-else>
                    <h6>{{event.title}}</h6>
                    <p>{{ event.description }}</p>
                    <span>{{ formatDate(event.start_datetime || event.startDate) }} - {{ formatDate(event.end_datetime || event.endDate) }}</span>
                  </div>
                </div>
                <a
                  v-if="event.meeting_link || event.meetingLink"
                  :href="event.meeting_link || event.meetingLink"
                  target="_blank"
                  class="btn btn-primary btn-sm"
                >
                  {{ $t('mediatorDashboard.join') }}
                </a>
              </div>
            </template>
          </div>
          <kadr-empty-state
            v-else
            compact
            icon=""
            :description="$t('mediatorDashboard.noMeetingsToday')"
          />
        </template>
      </iq-card>

      <iq-card class="workspace-card">
        <template v-slot:headerTitle>
          <h4 class="card-title">{{ $t('mediatorDashboard.notes') }}</h4>
        </template>
        <template v-slot:headerAction>
          <button type="button" class="btn btn-primary btn-sm" @click="onClickNewAdd('', '')">
            {{ $t('mediatorDashboard.addNote') }}
          </button>
        </template>
        <template v-slot:body>
          <div class="list-scroll">
            <div v-if="notes.length" class="notes-grid">
              <div class="note-card" v-for="(note, index) in notes" :key="`global-${index}`">
                <textarea
                  class="note-input"
                  v-model="note.content"
                  @input="onContentChange(index)"
                  :data-index="index"
                  :placeholder="$t('mediatorDashboard.notePlaceholder')"
                ></textarea>
                <div class="note-actions">
                  <button
                    v-if="note.isModified"
                    class="btn btn-sm btn-success"
                    @click="onClickSave(index)"
                  >
                    {{ $t('mediatorDashboard.save') }}
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="onClickDelete(index)">
                    {{ $t('mediatorDashboard.delete') }}
                  </button>
                </div>
              </div>
            </div>
            <kadr-empty-state
              v-else
              compact
              icon=""
              :description="$t('mediatorDashboard.noNotes')"
            />
          </div>
        </template>
      </iq-card>
    </div>

    <div
      class="workspace-grid workspace-grid--tools"
      :class="{ 'workspace-grid--tools-single': !hasCourtCaseTracker }"
    >
      <mediator-court-case-tracker v-if="hasCourtCaseTracker" />
      <mediator-legal-feed-panel />
    </div>

    <my-cases :cases="content.myCases" :user-name="user.name" :user-id="user.id" @refresh-dashboard="$emit('refresh-dashboard')"></my-cases>
  </b-container>
</template>
<script>
import Alert from '../../components/sofbox/alert/Alert.vue'
import MyCases from './MyCases.vue'
import MediatorCourtCaseTracker from '../../components/mediator/MediatorCourtCaseTracker.vue'
import MediatorLegalFeedPanel from '../../components/mediator/MediatorLegalFeedPanel.vue'
import KadrDashboardHero from '../../components/kadr/KadrDashboardHero.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'
const PERSONAL_EVENT_COLOR = 'var(--kadr-event-personal)'
const KADR_EVENT_COLOR = 'var(--kadr-event-kadr)'

export default {
  name: 'DashboardMediator',
  props: {
    user: null,
    content: null
  },
  components: {
    Alert,
    MyCases,
    MediatorCourtCaseTracker,
    MediatorLegalFeedPanel,
    KadrDashboardHero,
    KadrEmptyState
  },
  computed: {
    rewardBalance () {
      return this.content?.rewardPoints?.balance ?? 0
    },
    totalCases () {
      return this.content?.myCases?.total || this.content?.myCases?.casesWithEvents?.length || 0
    },
    todaysEvents () {
      return this.content?.todaysEvent || []
    },
    hasCourtCaseTracker () {
      return this.$store.getters.mediatorHasFeature('court_case_tracker')
    },
    avatarUrl () {
      return (this.content.user && this.content.user.profile_picture_url) || ''
    },
    heroStats () {
      return [
        { key: 'cases', label: this.$t('mediatorDashboard.assignedCases'), value: this.totalCases },
        { key: 'meetings', label: this.$t('mediatorDashboard.meetingsToday'), value: this.todaysEvents.length },
        {
          key: 'rewards',
          label: this.$t('mediatorDashboard.rewardPoints'),
          value: this.rewardBalance,
          hint: this.$t('mediatorDashboard.viewStore'),
          title: this.$t('mediatorDashboard.viewRewardStore'),
          onClick: () => this.goToRewards()
        }
      ]
    }
  },
  methods: {
    goToRewards () {
      this.$router.push({ name: 'app.rewards' })
    },
    formatDate (dateString) {
      return this.$formatTime(dateString)
    },
    showAlert (message, type) {
      this.alert = {
        message,
        type,
        visible: true
      }
    },
    async onClickDelete (index) {
      if (confirm(this.$t('mediatorDashboard.confirmDeleteNote'))) {
        const noteToDelete = this.notes[index]
        if (noteToDelete.id !== '') {
          await this.$store.dispatch('deleteNote', {
            id: noteToDelete.id
          })
        }
        this.notes.splice(index, 1)
        this.showAlert(this.$t('mediatorDashboard.noteDeleted'), 'success')
      }
    },
    onContentChange (index) {
      this.notes[index].isModified = true
    },
    onClickNewAdd (content, id) {
      this.notes.push({
        id,
        content
      })
    },
    async onClickSave (index) {
      const note = this.notes[index]
      if (note.isModified === true) {
        const response = await this.$store.dispatch('saveNote', {
          content: note.content,
          id: note.id
        })
        if (!response.errorCode) {
          this.showAlert(this.$t('mediatorDashboard.noteSaved'), 'success')
        }
        note.isModified = false
      }
    }
  },
  mounted () {
    for (let i = 0; i < this.content.notes.length; i++) {
      const note = this.content.notes[i]
      this.onClickNewAdd(note.note_text, note.id)
    }
    const ref = this
    this._keydownHandler = function (event) {
      const activeElement = document.activeElement
      if (activeElement.tagName === 'TEXTAREA') {
        if ((event.metaKey || event.ctrlKey) && event.key === 's') {
          event.preventDefault()
          const noteIndex = activeElement.dataset.index
          if (noteIndex !== undefined) {
            ref.onClickSave(Number(noteIndex))
          }
        }
      }
    }
    document.addEventListener('keydown', this._keydownHandler)
  },
  beforeUnmount () {
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler)
    }
  },
  data () {
    return {
      personalEventColor: PERSONAL_EVENT_COLOR,
      kadrEventColor: KADR_EVENT_COLOR,
      alert: {
        visible: false,
        message: '',
        timeout: 5000,
        type: 'primary'
      },
      notes: [],
      chart1: null,
      chart4: null
    }
  }
}
</script>
<style scoped>
.workspace-grid--tools {
  margin-top: 0;
}

.workspace-grid--tools-single {
  grid-template-columns: 1fr;
}

.notes-grid {
  display: grid;
  gap: 0.75rem;
}

.note-card {
  border: 1px solid var(--kadr-border);
  border-radius: var(--kadr-radius-md);
  padding: 0.75rem;
  background: var(--kadr-surface-info);
}

.note-input {
  width: 100%;
  min-height: 120px;
  border: 1px solid var(--kadr-border-strong);
  border-radius: var(--kadr-radius);
  padding: 0.65rem 0.75rem;
  resize: vertical;
}

.note-actions {
  margin-top: 0.6rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
}

.stat-card-link:hover,
.stat-card-link:focus {
  background: rgba(255, 255, 255, 0.28);
  outline: none;
  transform: translateY(-1px);
}
</style>
