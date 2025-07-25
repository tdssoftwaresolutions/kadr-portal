<template>
    <div class="container mt-4">
        <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
        <Spinner :isVisible="loading" />
        <div>
          <div>
            <div class="section-title">Case Details</div>
            <!-- New/updated fields from MediationForm -->
            <div class="data-row">
                <div class="col-6">
                    <div class="data-title">Case ID</div>
                    <div>{{ caseObject.caseId || caseObject.case_id }}</div>
                </div>
                <div class="col-6">
                    <div class="data-title">Suit No/Case No</div>
                    <div>{{ caseObject.suit_no }}</div>
                </div>
            </div>
            <div class="data-row">
                <div class="col-6">
                    <div class="data-title">Next Date of Hearing in Referral Court</div>
                    <div>{{ formatDate(caseObject.hearing_date, 'display') }}</div>
                </div>
                <div class="col-6">
                    <div class="data-title">Date of Institution of Case</div>
                    <div>{{ formatDate(caseObject.institution_date, 'display') }}</div>
                </div>
            </div>
            <div class="data-row">
                <div class="col-6">
                    <div class="data-title">Nature of Suit</div>
                    <div>{{ caseObject.nature_of_suit }}</div>
                </div>
                <div class="col-6">
                    <div class="data-title">Stage of the Case at Time of Referral</div>
                    <div>{{ caseObject.stage }}</div>
                </div>
            </div>
            <div class="data-row">
                <div class="col-6">
                    <div class="data-title">Number of Hearings at Time of Referral</div>
                    <div>{{ caseObject.hearing_count }}</div>
                </div>
                <div class="col-6">
                    <div class="data-title">Name of the Referral Judge</div>
                    <div>{{ caseObject.user_cases_judgeTouser.name }}</div>
                </div>
            </div>
            <div class="data-row">
                <div class="col-6">
                    <div class="data-title">Mediation Date & Time</div>
                    <div>{{ formatDate(caseObject.mediation_date_time,'display',{includeTime : true}) }}</div>
                </div>
                <div class="col-6">
                    <div class="data-title">Additional Document</div>
                    <div>
                        <a v-if="caseObject.judge_document_url" :href="caseObject.judge_document_url" target="_blank">Click here to view the document</a>
                    </div>
                </div>
            </div>
        </div>

        <!-- Party Details Section -->
        <div v-if="caseObject.user_cases_first_partyTouser != null">
            <div class="section-title">First Party Details</div>
            <div class="data-row">
                <div class="col-6">
                    <div class="data-title">Party Name</div>
                    <div>{{ caseObject.user_cases_first_partyTouser.name }}</div>
                </div>
                <div class="col-6">
                    <div class="data-title">Email</div>
                    <div>{{ caseObject.user_cases_first_partyTouser.email }}</div>
                </div>
            </div>
            <div class="data-row">
                <div class="col-6">
                  <div class="data-title">Phone</div>
                  <div>{{ caseObject.plaintiff_phone }}</div>
                </div>
                <div class="col-6">
                  <div class="data-title">Advocate</div>
                  <div>{{ caseObject.plaintiff_advocate }}</div>
                </div>
            </div>
        </div>

        <!-- Opponent Details Section -->
        <div v-if="caseObject.user_cases_second_partyTouser != null">
            <div class="section-title">Second Party Details</div>
            <div class="data-row">
                <div class="col-6">
                    <div class="data-title">Party Name</div>
                    <div>{{ caseObject.user_cases_second_partyTouser.name }}</div>
                </div>
                <div class="col-6">
                    <div class="data-title">Email</div>
                    <div>{{ caseObject.user_cases_second_partyTouser.email }}</div>
                </div>
            </div>
            <div class="data-row">
                <div class="col-6">
                    <div class="data-title">Phone</div>
                    <div>{{ caseObject.respondent_phone }}</div>
                </div>
                <div class="col-6">
                    <div class="data-title">Advocate</div>
                    <div>{{ caseObject.respondent_advocate }}</div>
                </div>
            </div>
        </div>
        </div>

        <!-- Events Section -->
        <div>
            <div class="section-title">Meetings ({{caseObject.events.length}})
            <b-button variant="primary" style="float:right" onclick="window.open('/admin/app/calendar','_self')">New</b-button>
            </div>
            <div class="table-content">
                <b-table bordered hover :items="caseObject.events" :fields="caseColumns" responsive="xl" v-if="caseObject.events.length>0">
                    <template v-slot:cell(start_datetime)="data">
                      {{formatDate(data.item.start_datetime, 'display', { includeTime: true })}}
                    </template>
                    <template v-slot:cell(end_datetime)="data">
                      {{formatDate(data.item.end_datetime, 'display', { includeTime: true })}}
                    </template>
                    <template v-slot:cell(meeting_link)="data">
                      <span v-if="isURL(data.item.meeting_link)">
                          <a :href="data.item.meeting_link" target="_blank">Join</a>
                      </span>
                    </template>
                    <template v-slot:cell(status)="data">
                      <b-badge pill :variant="getVariant(getStatus(data.item))">{{getStatus(data.item)}}</b-badge>
                    </template>
                </b-table>
                <div v-else>
                    <h3 style="text-align: center;">No meeting found!</h3>
                </div>
            </div>
        </div>

        <!-- Notes Section -->
        <div>
            <div class="section-title">Notes</div>
            <div class="table-content">
                <div class="textarea-wrapper">
                  <textarea class="sticky-note" v-model="note" @input="onNoteChange" :data-index="index"></textarea>
                  <button v-if="isNoteModified" class="save-btn" aria-label="Save" @click="onClickSaveNote">
                    <i class="fas fa-save"></i>
                  </button>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import Alert from '../../components/sofbox/alert/Alert.vue'
import Spinner from '../../components/sofbox/spinner/spinner.vue'

export default {
  name: 'ViewCaseDetails',
  components: {
    Alert, Spinner
  },
  props: {
    caseObject: {
      type: Object,
      required: true
    }
  },
  methods: {
    formatDate (dateString, type = 'display', options = {}) {
      if (!dateString) return ''

      const date = new Date(dateString)

      const pad = (n) => (n < 10 ? '0' + n : n)

      switch (type) {
        case 'date':
          return date.toISOString().split('T')[0]

        case 'datetime-local': {
          const year = date.getFullYear()
          const month = pad(date.getMonth() + 1)
          const day = pad(date.getDate())
          const hours = pad(date.getHours())
          const minutes = pad(date.getMinutes())
          return `${year}-${month}-${day}T${hours}:${minutes}`
        }

        case 'display':
        default: {
          const { includeTime = false } = options

          return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...(includeTime && {
              hour: 'numeric',
              minute: 'numeric',
              hour12: true
            })
          })
        }
      }
    },
    onNoteChange () {
      this.isNoteModified = true
    },
    getStatus (item) {
      const startDateTime = new Date(item.start_datetime)
      const currentDateTime = new Date()
      if (startDateTime.getTime() === currentDateTime.getTime()) {
        return 'Today'
      } else if (startDateTime.getTime() < currentDateTime.getTime()) {
        return 'Past'
      } else {
        return 'Upcoming'
      }
    },
    getVariant (status) {
      switch (status) {
        case 'Today':
          return 'success'
        case 'Past':
          return 'secondary'
        case 'Upcoming':
          return 'primary'
      }
    },
    onClickSaveNote () {
      if (this.note) {
        this.$cookies.set('notes', this.note)
        this.$bvToast.toast('Note saved!', {
          title: 'Success',
          variant: 'success',
          solid: true
        })
        this.isNoteModified = false
      }
    },
    showAlert (message, type) {
      this.alert = {
        message,
        type,
        visible: true
      }
    },

    isURL (value) {
      const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i
      return urlPattern.test(value)
    }
  },
  data () {
    return {
      note: '',
      isNoteModified: false,
      firstPartyPreferredLanguages: '',
      alert: {
        visible: false,
        message: '',
        timeout: 5000,
        type: 'primary'
      },
      loading: false,
      caseColumns: [
        { label: 'Start Date Time', key: 'start_datetime', class: 'text-left', sortable: true },
        { label: 'End Date Time', key: 'end_datetime', class: 'text-left', sortable: true },
        { label: 'Status', key: 'status', class: 'text-left' },
        { label: 'Meeting', key: 'meeting_link', class: 'text-left' }
      ]
    }
  }
}
</script>
<style scoped>
.section-title {
  background-color: #f8f9fa;
  padding: 10px 15px;
  margin-top: 20px;
  font-size: 1.25rem;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.data-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f1f1f1;
}

.data-row:last-child {
  border-bottom: none;
}

.data-title {
  font-weight: bold;
}

.long-description {
  padding: 10px;
}

.table-content {
    padding-left: 5px;
    padding-right:5px;
    margin-top: 10px;
}

.long-description textarea {
  width: 100%;
  resize: none;
  border: 0px;
}
.textarea-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.save-btn {
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

.save-btn {
  top: 5px; /* Position save button below the delete button */
  color: #4CAF50; /* Green color for the save button */
}

.sticky-note {
  font: 17px 'Gloria Hallelujah', cursive;
  line-height: 1.5;
  border: 0;
  border-radius: 3px;
  background: linear-gradient(#F9EFAF, #F7E98D);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow-x: hidden;
  overflow-y: auto;
  transition: box-shadow 0.5s ease;
  max-height: 250px;
  width: 100%;
  height: 150px;
  padding-right: 2rem;
  padding-left: 0.5rem;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
}
</style>
