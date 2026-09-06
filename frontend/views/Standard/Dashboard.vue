<template>
  <div>
    <div v-if="dashboardContent == null" class="dashboard-loading">
      <kadr-spinner size="lg" :label="$t('standardPages.loadingDashboard')" />
    </div>
    <div v-else>
      <dashboard-client v-if="user.type == 'CLIENT' || user.type == 'REPRESENTATIVE'" :user="user" :content="dashboardContent" @refresh-dashboard="getDashboardContent(true)"/>
      <dashboard-mediator v-else-if="user.type == 'MEDIATOR'" :user="user"  :content="dashboardContent" @refresh-dashboard="getDashboardContent(true)"/>
      <dashboard-admin v-else-if="user.type == 'ADMIN'" :user="user"  :content="dashboardContent"/>
    </div>
  </div>
</template>
<script>
import { defineAsyncComponent } from 'vue'
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'Dashboard',
  components: {
    DashboardClient: defineAsyncComponent(() => import('../ClientControllers/DashboardClient.vue')),
    DashboardMediator: defineAsyncComponent(() => import('../MediatorControllers/DashboardMediator.vue')),
    DashboardAdmin: defineAsyncComponent(() => import('../AdminControllers/DashboardAdmin.vue'))
  },
  props: {
    user: null
  },
  data () {
    return {
      dashboardContent: null
    }
  },
  mounted () {
    sofbox.index()
    if (!this.isSessionAvailable()) {
      this.$router.push({ path: '/auth/sign-in' })
    } else {
      this.getDashboardContent()
    }
  },
  methods: {
    isSessionAvailable () {
      if (this.$cookies.get('accessToken')) {
        return true
      }
      return false
    },
    async getDashboardContent (force = false) {
      const response = await this.$store.dispatch('getDashboardContent', { force })
      if (!response.success) {
      } else {
        this.dashboardContent = response.data.dashboardContent
      }
    }
  }
}
</script>

<style scoped>
.dashboard-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
}
</style>
