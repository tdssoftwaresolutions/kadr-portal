<template>
    <b-container fluid>
      <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
      <Spinner :isVisible="loading" />
      <b-row>
        <b-col lg="3" md="12">
          <iq-card class="iq-profile-card text-center">
            <template v-slot:body>
              <div class="iq-team text-center p-0">
                <img v-if="content.user.profile_picture_url" :src="content.user.profile_picture_url" class="img-fluid mb-3 avatar-120 rounded-circle" alt="" style="object-fit: cover;"/>
                <img v-else :src="require('../../assets/images/user/1.jpg')" class="img-fluid mb-3 avatar-120 rounded-circle" alt=""/>
                <h4 class="mb-0">Welcome {{ user.name }}</h4>
                <p class="d-inline-block w-100">{{ user.email }}</p>
              </div>
            </template>
          </iq-card>
          <iq-card>
            <template v-slot:headerTitle>
              <h4 class="card-title">Today's Schedule</h4>
            </template>
            <template v-slot:body>
              <ul class="m-0 p-0 today-schedule" style="overflow-y: scroll;max-height: 300px;">
                <li class="d-flex align-items-center justify-content-between" v-for="(event, index) in content.todaysEvent" :key="index">
                  <div class="d-flex align-items-center">
                    <div class="schedule-icon">
                      <i class="ri-checkbox-blank-circle-fill" :style="{ color: kadrEventColor }" v-if="event.type == 'KADR'"></i>
                      <i class="ri-checkbox-blank-circle-fill" :style="{ color: personalEventColor }" v-else></i>
                    </div>
                    <div class="schedule-text" v-if="event.type == 'KADR'">
                      <span  style="font-weight: bold">Case #{{ event.caseNumber }}</span>
                      <span>{{ event.firstPartyName }} vs {{ event.secondPartyName }}</span>
                      <span>
                        {{ formatDate(event.startDate) }} to {{ formatDate(event.endDate) }}
                      </span>
                    </div>
                    <div class="schedule-text" v-else>
                      <span  style="font-weight: bold">{{ event.title }}</span>
                      <span>
                        {{ formatDate(event.startDate) }} to {{ formatDate(event.endDate) }}
                      </span>
                    </div>
                  </div>
                  <a v-if="event.meetingLink != ''" :href="event.meetingLink"
                    target="_blank"
                    class="btn btn-primary btn-sm" >
                    Join Meeting
                </a>
                </li>
              </ul>
            </template>
          </iq-card>
        </b-col>
        <b-col lg="4" md="12">
          <iq-card>
            <template v-slot:headerTitle>
              <h4 class="card-title">My Notes</h4>
            </template>
            <template v-slot:headerAction>
              <a href="#" class="btn btn-primary" @click="onClickNewAdd('','')">
                  Add New
              </a>
            </template>
            <template v-slot:body>
              <div style="height: 400px;overflow-x: scroll; ">
                <div class="textarea-wrapper" v-for="(note, index) in notes" :key="index">
                  <textarea class="sticky-note" v-model="note.content" @input="onContentChange(index)" :data-index="index"></textarea>
                  <button v-if="note.isModified" class="save-btn" aria-label="Save" @click="onClickSave(index)">
                    <i class="fas fa-save"></i>
                  </button>
                  <button class="delete-btn" aria-label="Delete" @click="onClickDelete(index)">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
            </template>
          </iq-card>
        </b-col>
        <b-col lg="5" md="12">
          <iq-card class-name="overflow-hidden" body-class="pb-0">
            <template v-slot:body>
              <div class="rounded-circle iq-card-icon iq-bg-primary"><i class="ri-exchange-dollar-fill"></i></div>
              <span class="float-right line-height-6">Current Month's Income</span>
              <div class="clearfix"></div>
              <div class="text-center">
                <h2 class="mb-0"><span class="counter">Rs.</span><span>65k</span></h2>
                <p class="mb-0 text-secondary line-height"><i class="ri-arrow-up-line text-success ms-1"></i><span class="text-success">10%</span> Increased</p>
              </div>
            </template>
            <ApexChart element="chart-1" :chartOption="chart1"/>
          </iq-card>
          <iq-card class-name="overflow-hidden" body-class="pb-0">
            <template v-slot:body>
              <div class="rounded-circle iq-card-icon iq-bg-danger"><i class="ri-shopping-cart-line"></i></div>
              <span class="float-right line-height-6">Number of Cases Resolved</span>
              <div class="clearfix"></div>
              <div class="text-center">
                <h2 class="mb-0"><span class="counter">30</span><span></span></h2>
                <p class="mb-0 text-secondary line-height"><i class="ri-arrow-down-line text-danger ms-1"></i><span class="text-danger">10%</span> Increased</p>
              </div>
            </template>
            <ApexChart element="chart-4" :chartOption="chart4"/>
          </iq-card>
        </b-col>
      </b-row>
      <b-row>
        <b-col lg="12" md="12">
          <iq-card>
            <template v-slot:headerTitle>
              <h4 class="card-title">My Cases</h4>
            </template>
            <template v-slot:body>
              <my-cases :cases="content.myCases"></my-cases>
            </template>
          </iq-card>
        </b-col>
      </b-row>
    </b-container>
</template>
<script>
import Alert from '../../components/sofbox/alert/Alert.vue'
import Spinner from '../../components/sofbox/spinner/spinner.vue'
import MyCases from '../Tables/MyCases.vue'
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
      chart1: {
        chart: {
          height: 80,
          type: 'area',
          sparkline: {
            enabled: true
          },
          group: 'sparklines'

        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: 3,
          curve: 'smooth'
        },
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.5,
            opacityTo: 0
          }
        },
        series: [{
          name: 'series1',
          data: [60, 15, 50, 30, 70]
        }],
        colors: ['#0084ff'],

        xaxis: {
          type: 'datetime',
          categories: ['2018-08-19T00:00:00', '2018-09-19T01:30:00', '2018-10-19T02:30:00', '2018-11-19T01:30:00', '2018-12-19T01:30:00']
        },
        tooltip: {
          x: {
            format: 'dd/MM/yy HH:mm'
          }
        }
      },
      chart4: {
        chart: {
          height: 80,
          type: 'area',
          sparkline: {
            enabled: true
          },
          group: 'sparklines'

        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: 3,
          curve: 'smooth'
        },
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.5,
            opacityTo: 0
          }
        },
        series: [{
          name: 'series1',
          data: [75, 30, 60, 35, 60]
        }],
        colors: ['#e64141'],
        xaxis: {
          type: 'datetime',
          categories: ['2018-08-19T00:00:00', '2018-09-19T01:30:00', '2018-10-19T02:30:00', '2018-11-19T01:30:00', '2018-12-19T01:30:00']
        },
        tooltip: {
          x: {
            format: 'dd/MM/yy HH:mm'
          }
        }
      }
    }
  }
}
</script>
<style scoped>
.textarea-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.delete-btn, .save-btn {
  position: absolute;
  right: 5px;
  background: transparent;
  border: none;
  font-size: 24px; /* Icon size */
  color: #f00; /* Red color for delete button */
  cursor: pointer;
  padding: 8px;
  border-radius: 50%; /* Round button for a circular appearance */
  transition: background 0.3s ease;
}

.delete-btn {
  top: 5px; /* Position delete button at the top right */
}

.save-btn {
  top: 40px; /* Position save button below the delete button */
  color: #4CAF50; /* Green color for the save button */
}

textarea {
  font: 17px 'Gloria Hallelujah', cursive;
  line-height: 1.5;
  border: 0;
  border-radius: 3px;
  background: linear-gradient(#F9EFAF, #F7E98D);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow-x: hidden;
  overflow-y: auto;
  transition: box-shadow 0.5s ease;
  max-width: 520px;
  max-height: 250px;
  width: 100%;
  height: 150px;
  padding-right: 2rem;
  padding-left: 0.5rem;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
}

</style>
