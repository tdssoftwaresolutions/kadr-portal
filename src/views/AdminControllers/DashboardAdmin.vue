<template>
  <b-container fluid class="dashboard-client-page">
    <div class="hero-card">
      <div class="hero-profile">
        <img
          v-if="user && user.photo"
          :src="user.photo"
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
          <span class="stat-label">Mediators</span>
          <span class="stat-value">{{ content.count.mediators }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Clients</span>
          <span class="stat-value">{{ content.count.clients }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Cases</span>
          <span class="stat-value">{{ content.count.cases }}</span>
        </div>
      </div>
    </div>
    <b-row  class="cases-workspace">
      <b-col sm="12"  class="cases-overview">
         <div class="overview-head">
          <h4>Approvals</h4>
          <p>Manage and approve new client and mediator requests</p>
        </div>
        <section no-body >
          <b-tabs card header-class="bg-transparent border-0" nav-class="bg-transparent">
            <b-tab :title="'New Clients ('+content.inactive_users.total+')'" active><p>
              <inactive-users :users="content.inactive_users" type="CLIENT"></inactive-users>
            </p></b-tab>
            <b-tab :title="'New Dispute Resolution Experts ('+content.inactive_mediators.total+')'"><p>
              <inactive-users :users="content.inactive_mediators" type="MEDIATOR"></inactive-users>
            </p></b-tab>
          </b-tabs>
        </section>
      </b-col>
    </b-row>
    <client-cases :userid="user.id" :content="content"></client-cases>
  </b-container>
</template>
<script>
import InactiveUsers from '../AdminControllers/InactiveUsers.vue'

export default {
  name: 'DashboardAdmin',
  props: {
    user: null,
    content: null
  },
  components: {
    InactiveUsers
  },
  data () {
    return {
    }
  }
}
</script>
<style scoped>

.overview-head h4 {
  margin: 0;
}

.overview-head p {
  margin: 0.35rem 0 0.9rem;
  color: #6d7693;
}

::v-deep .card-header {
  background-color: unset !important;
  border-bottom: unset !important;
}
img.summary-image-top {
    width: 50px;
}
.dashboard-client-page {
  background: #f4f6fb;
}

.cases-workspace {
  margin-top: 1rem;
  margin-left:unset;
  margin-right:unset;
}

.cases-overview {
  background: #fff;
  border: 1px solid #e8ebf5;
  border-radius: 14px;
  padding: 1rem;
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
