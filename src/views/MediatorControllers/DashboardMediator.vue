<template>
  <b-container fluid class="dashboard-client-page">
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
    <Spinner :isVisible="loading" />

    <div class="hero-card">
      <div class="hero-profile">
        <img
          v-if="content.user && content.user.profile_picture_url"
          :src="content.user.profile_picture_url"
          class="hero-avatar"
          alt="Profile picture"
        >
        <img
          v-else
          :src="require('../../assets/images/user/1.jpg')"
          class="hero-avatar"
          alt="Profile picture"
        >
        <div class="hero-user-meta">
          <h3>Welcome back, {{ user.name }}</h3>
          <p>{{ user.email }}</p>
        </div>
      </div>

      <div class="hero-stats">
        <div class="stat-card">
          <span class="stat-label">Assigned Cases</span>
          <span class="stat-value">{{ totalCases }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Meetings Today</span>
          <span class="stat-value">{{ todaysEvents.length }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Global Notes</span>
          <span class="stat-value">{{ notes.length }}</span>
        </div>
      </div>
    </div>
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
          <div v-else class="empty-data">No meetings scheduled for today.</div>
        </template>
      </iq-card>

      <iq-card class="workspace-card">
        <template v-slot:headerTitle>
          <h4 class="card-title">Global Notes</h4>
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
            <div v-else class="empty-data">No global notes yet. Add one to keep quick references.</div>
          </div>
        </template>
      </iq-card>
    </div>

    <my-cases :cases="content.myCases" :user-name="user.name" :user-id="user.id" @refresh-dashboard="$emit('refresh-dashboard')"></my-cases>
  </b-container>
</template>
<script>
import Alert from '../../components/sofbox/alert/Alert.vue'
import Spinner from '../../components/sofbox/spinner/spinner.vue'
import MyCases from './MyCases.vue'
const PERSONAL_EVENT_COLOR = 'rgb(244, 81, 30)'
const KADR_EVENT_COLOR = 'rgb(121, 134, 203)'

export default {
  name: 'DashboardMediator',
  props: {
    user: null,
    content: null
  },
  components: {
    Alert, Spinner, MyCases
  },
  computed: {
    totalCases () {
      return this.content?.myCases?.total || this.content?.myCases?.casesWithEvents?.length || 0
    },
    todaysEvents () {
      return this.content?.todaysEvent || []
    }
  },
  methods: {
    formatDate (dateString) {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        hour: 'numeric', // '6 PM'
        minute: 'numeric', // '52'
        hour12: true // 12-hour clock
      })
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
      this.$set(this.notes[index], 'isModified', true)
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
        this.$set(note, 'isModified', false)
      }
    }
  },
  mounted () {
    for (let i = 0; i < this.content.notes.length; i++) {
      const note = this.content.notes[i]
      this.onClickNewAdd(note.note_text, note.id)
    }
    const ref = this
    document.addEventListener('keydown', function (event) {
      const activeElement = document.activeElement
      if (activeElement.tagName === 'TEXTAREA') {
        if ((event.metaKey || event.ctrlKey) && event.key === 's') {
          event.preventDefault()
          const noteIndex = activeElement.dataset.index
          if (noteIndex !== undefined) {
            ref.onClickSave(Number(noteIndex))
          } else {
            console.error('Could not find associated note for saving.')
          }
        }
      }
    })
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
      loading: false,
      notes: [],
      chart1: null,
      chart4: null
    }
  }
}
</script>
<style scoped>
.dashboard-client-page {
  background: #f4f6fb;
}

.hero-card {
  border-radius: 16px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  background: linear-gradient(120deg, #2b4ecf 0%, #5e7df7 100%);
  color: #fff;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.hero-profile {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.hero-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.35);
  object-fit: cover;
}

.hero-user-meta h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: bold;
  color:white;
  font-size: 20px;
}

.hero-user-meta p {
  margin: 0.25rem 0 0;
  opacity: 0.9;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(140px, 1fr));
  gap: 0.75rem;
  width: 100%;
  max-width: 460px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.78rem;
  opacity: 0.88;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.workspace-card {
  border-radius: 14px;
}

.notes-grid {
  display: grid;
  gap: 0.75rem;
}

.note-card {
  border: 1px solid #ebedf5;
  border-radius: 10px;
  padding: 0.75rem;
  background: #fafcff;
}

.note-input {
  width: 100%;
  min-height: 120px;
  border: 1px solid #d8dff1;
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  resize: vertical;
}

.note-actions {
  margin-top: 0.6rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
}

.list-scroll {
  max-height: 320px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.schedule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem;
  border: 1px solid #ebedf5;
  border-radius: 10px;
  margin-bottom: 0.7rem;
}

.schedule-main {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
}

.schedule-dot {
  margin-top: 0.2rem;
}

.schedule-text h6 {
  margin: 0;
  font-weight: 600;
}

.schedule-text p {
  margin: 0.15rem 0;
  color: #4a5472;
}

.schedule-text span {
  color: #6f7894;
  font-size: 0.86rem;
}

.notification-item {
  padding: 0.85rem;
  border: 1px solid #ebedf5;
  border-radius: 10px;
  margin-bottom: 0.7rem;
}

.notification-head {
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
}

.notification-head h6 {
  margin: 0;
  font-weight: 600;
}

.notification-head small {
  color: #6f7894;
  font-weight: 600;
}

.notification-item p {
  margin: 0.4rem 0 0;
  color: #4a5472;
}

.empty-data {
  text-align: center;
  color: #7c86a7;
  padding: 1.4rem 0.6rem;
  border: 1px dashed #d8dded;
  border-radius: 10px;
}

@media (max-width: 991px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .hero-stats {
    max-width: none;
  }
}

@media (max-width: 575px) {
  .dashboard-client-page {
    padding: 0.5rem;
  }

  .hero-card {
    padding: 1rem;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }
}
</style>
