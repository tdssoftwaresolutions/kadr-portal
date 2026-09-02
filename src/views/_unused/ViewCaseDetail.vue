<template>
    <div class="container mt-4">
        <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
        <Spinner :isVisible="loading" />
        <div>
            <div class="section-title">Case Details</div>
            <div class="data-row">
                <div class="col-6">
                    <div class="data-title">Case ID</div>
                    <div>{{ caseObject.caseId }}</div>
                </div>
                <div class="col-6">
                    <div class="data-title">Case Type</div>
                    <div>{{ caseObject.case_type }}</div>
                </div>
            </div>
            <div class="data-row">
                <div class="col-6">
                    <div class="data-title">Case Category</div>
                    <div>{{ caseObject.category }}</div>
                </div>
                <div class="col-6">
                    <div class="data-title">Evidence</div>
                    <div> <a :href="caseObject.evidence_document_url" target="_blank">Link to document</a></div>
                </div>
            </div>
            <div class="long-description">
                <div class="data-title">Case Description</div>
                <textarea rows="5" readonly :value="caseObject.description">
                </textarea>
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
                    <div class="data-title">Preferred Language</div>
                    <div>{{ firstPartyPreferredLanguages }}</div>
                </div>
            </div>
            <div class="data-row">
                <div class="col-6">
                    <div class="data-title">State</div>
                    <div>{{ caseObject.user_cases_first_partyTouser.state }}</div>
                </div>
                <div class="col-6">
                    <div class="data-title">City</div>
                    <div>{{ caseObject.user_cases_first_partyTouser.city }}</div>
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
                    <div class="data-title">Preferred Language</div>
                    <div>{{ caseObject.user_cases_second_partyTouser.preferred_languages }}</div>
                </div>
            </div>
            <div class="data-row">
                <div class="col-6">
                    <div class="data-title">State</div>
                    <div>{{ caseObject.user_cases_second_partyTouser.state }}</div>
                </div>
                <div class="col-6">
                    <div class="data-title">City</div>
                    <div>{{ caseObject.user_cases_second_partyTouser.city }}</div>
                </div>
            </div>
        </div>

        <!-- Events Section -->
        <div>
            <div class="section-title">Meetings ({{caseObject.events.length}})
            <b-button variant="primary" style="float:right" onclick="window.open('/app/calendar','_blank')">New</b-button>
            </div>
            <div class="table-content">
                <b-table bordered hover :items="caseObject.events" :fields="caseColumns" responsive="xl" v-if="caseObject.events.length>0">
                    <template v-slot:cell(start_datetime)="data">
                      {{formatDate(data.item.start_datetime)}}
                    </template>
                    <template v-slot:cell(end_datetime)="data">
                      {{formatDate(data.item.end_datetime)}}
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
  async mounted () {
    this.firstPartyPreferredLanguages = await this.getPreferredLanguages(this.caseObject.user_cases_first_partyTouser.preferred_languages)
  },
  methods: {
    onNoteChange () {
      this.isNoteModified = true
    },
    async getPreferredLanguages (data) {
      let languages = ''
      let availableLanguagesArray = JSON.parse(data)
      try {
        const allLanguages = await this.$store.dispatch('getAllLanguages')
        availableLanguagesArray.forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(allLanguages.languages, key)) {
            languages += allLanguages.languages[key] + ', '
          }
        })
        if (languages.endsWith(', ')) {
          languages = languages.slice(0, -2)
        }
      } catch (error) {
        console.error('Error fetching languages:', error)
      }
      return languages
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
    formatDate (dateString) {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        weekday: 'long', // 'Monday'
        year: 'numeric', // '2024'
        month: 'long', // 'December'
        day: 'numeric', // '10'
        hour: 'numeric', // '6 PM'
        minute: 'numeric', // '52'
        second: 'numeric', // '47'
        hour12: true // 12-hour clock
      })
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
