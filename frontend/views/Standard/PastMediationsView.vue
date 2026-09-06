<template>
  <b-container fluid class="past-mediations-page">
    <kadr-page-header :title="$t('standardPages.pastTitle')" :subtitle="$t('standardPages.pastSubtitle')" />

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

    <kadr-empty-state
      v-else
      icon="fas fa-folder-open"
      :title="$t('standardPages.genericEmptyTitle')"
      :description="$t('standardPages.pastUnavailable')"
    />
  </b-container>
</template>

<script>
import MyCases from '../MediatorControllers/MyCases.vue'
import ClientCases from '../ClientControllers/ClientCases.vue'
import KadrPageHeader from '../../components/kadr/KadrPageHeader.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'PastMediationsView',
  components: {
    MyCases,
    ClientCases,
    KadrPageHeader,
    KadrEmptyState
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
      return this.user.type === 'CLIENT' || this.user.type === 'REPRESENTATIVE'
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
  background: var(--kadr-bg-page);
}
</style>
