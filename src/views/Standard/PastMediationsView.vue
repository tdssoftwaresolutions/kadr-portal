<template>
  <b-container fluid class="past-mediations-page">
    <iq-card>
      <template v-slot:headerTitle>
        <h4 class="card-title">Past Mediations</h4>
      </template>
      <template v-slot:body>
        <p class="subtitle">
          Review all completed or closed mediations, including case details, documents, timeline, and meetings.
        </p>
      </template>
    </iq-card>

    <my-cases
      v-if="isMediator"
      :cases="pastCases"
      :user-id="user.id"
      :user-name="user.name"
      :is-past-view="true"
      @refresh-dashboard="loadPastMediations"
    />

    <client-cases
      v-else-if="isClient"
      :content="{ myCases: pastCases.casesWithEvents || [] }"
      :userid="user.id"
      :is-past-view="true"
      @refresh-dashboard="loadPastMediations"
    />

    <iq-card v-else>
      <template v-slot:body>
        <div class="empty-state">Past mediations are available for mediator and client accounts only.</div>
      </template>
    </iq-card>
  </b-container>
</template>

<script>
import MyCases from '../MediatorControllers/MyCases.vue'
import ClientCases from '../ClientControllers/ClientCases.vue'
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'PastMediationsView',
  components: {
    MyCases,
    ClientCases
  },
  data () {
    return {
      pastCases: {
        casesWithEvents: [],
        total: 0,
        page: 1,
        perPage: 10
      }
    }
  },
  computed: {
    user () {
      return this.$store.getters.user || {}
    },
    isMediator () {
      return this.user.type === 'MEDIATOR'
    },
    isClient () {
      return this.user.type === 'CLIENT'
    }
  },
  mounted () {
    sofbox.index()
    this.loadPastMediations()
  },
  methods: {
    async loadPastMediations () {
      if (!this.user?.id) return
      const response = await this.$store.dispatch('getPastMediations', { page: 1 })
      if (!response.success) return
      this.pastCases = response.data || this.pastCases
    }
  }
}
</script>

<style scoped>
.past-mediations-page {
  background: #f4f6fb;
}

.subtitle {
  margin: 0;
  color: #6d7693;
}

.empty-state {
  border: 1px dashed #d7deef;
  border-radius: 10px;
  padding: 1rem;
  color: #5f6988;
  text-align: center;
}
</style>
