<template>
  <b-container fluid class="dashboard-client-page">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
    <Spinner :isVisible="loading" />

    <kadr-dashboard-hero
      :name="user.name"
      :email="user.email"
      :avatar-url="avatarUrl"
      :stats="heroStats"
    />
    <div class="workspace-grid">
      <iq-card class="workspace-card">
        <template v-slot:headerTitle>
          <h4 class="card-title">Today's Schedule</h4>
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
                    <h6>Case #{{ event.caseId || event.caseNumber || '-' }}</h6>
                    <p>{{ event.caseFirstPartyName || event.firstPartyName || '-' }} vs {{ event.caseSecondPartyName || event.secondPartyName || '-' }}</p>
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
                  Join
                </a>
              </div>
            </template>
          </div>
          <kadr-empty-state
            v-else
            compact
            icon=""
            :description="DASHBOARD.NO_MEETINGS_TODAY"
          />
        </template>
      </iq-card>

      <iq-card class="workspace-card">
        <template v-slot:headerTitle>
          <h4 class="card-title">Notes</h4>
        </template>
        <template v-slot:headerAction>
          <button type="button" class="btn btn-primary btn-sm" @click="onClickNewAdd('', '')">
            Add Note
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
                  placeholder="Write global mediator notes..."
                ></textarea>
                <div class="note-actions">
                  <button
                    v-if="note.isModified"
                    class="btn btn-sm btn-success"
                    @click="onClickSave(index)"
                  >
                    Save
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="onClickDelete(index)">
                    Delete
                  </button>
                </div>
              </div>
            </div>
            <kadr-empty-state
              v-else
              compact
              icon=""
              :description="DASHBOARD.NO_NOTES"
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
import Spinner from '../../components/sofbox/spinner/spinner.vue'
import MyCases from './MyCases.vue'
import MediatorCourtCaseTracker from '../../components/mediator/MediatorCourtCaseTracker.vue'
import MediatorLegalFeedPanel from '../../components/mediator/MediatorLegalFeedPanel.vue'
import KadrDashboardHero from '../../components/kadr/KadrDashboardHero.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'
import { DASHBOARD } from '../../constants/messages'
const PERSONAL_EVENT_COLOR = 'rgb(244, 81, 30)'
const KADR_EVENT_COLOR = 'rgb(121, 134, 203)'

export default {
  name: 'DashboardMediator',
  props: {
    user: null,
    content: null
  },
  components: {
    Alert,
    Spinner,
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
        { key: 'cases', label: 'Assigned Cases', value: this.totalCases },
        { key: 'meetings', label: 'Meetings Today', value: this.todaysEvents.length },
        {
          key: 'rewards',
          label: 'Reward Points',
          value: this.rewardBalance,
          hint: 'View store →',
          title: 'View reward store',
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
      if (confirm('Are you sure you want to delete this note?')) {
        const noteToDelete = this.notes[index]
        if (noteToDelete.id !== '') {
          await this.$store.dispatch('deleteNote', {
            id: noteToDelete.id
          })
        }
        this.notes.splice(index, 1)
        this.showAlert('Your note has been deleted successfully!', 'success')
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
          this.showAlert('Your note has been successfully saved!', 'success')
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
      DASHBOARD,
      alert: {
        visible: false,
        message: '',
        timeout: 5000,
        type: 'primary'
      },
      loading: false,
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
