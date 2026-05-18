import Vue from 'vue'
import VueRouter from 'vue-router'

/* Layouts */
import StandardLayout from '../layouts/StandardLayout.vue'
import Default from '../layouts/BlankLayout'
import AuthLayout from '../layouts/AuthLayout.vue'

/** Admin */
import AdminUsersListView from '../views/AdminControllers/AdminUsersListView.vue'
import AdminCasesManagementView from '../views/AdminControllers/AdminCasesManagementView.vue'
import GoogleAccountManagement from '../views/AdminControllers/GoogleAccountManagement.vue'
import AdminBlogTaxonomyView from '../views/AdminControllers/AdminBlogTaxonomyView.vue'
import AdminManagementView from '../views/AdminControllers/AdminManagementView.vue'
import AdminSettingsView from '../views/AdminControllers/AdminSettingsView.vue'
import AdminCalendar from '../views/AdminControllers/AdminCalendar.vue'
import AdminCorrespondenceInbox from '../views/AdminControllers/AdminCorrespondenceInbox.vue'
/** Mediator */
import InvoicesView from '../views/MediatorControllers/InvoicesView.vue'
import MediatorRewardsView from '../views/MediatorControllers/MediatorRewardsView.vue'
import AdminRewardOrdersView from '../views/AdminControllers/AdminRewardOrdersView.vue'
import AdminMediator360View from '../views/AdminControllers/AdminMediator360View.vue'
import PortalSupportView from '../views/Standard/PortalSupportView.vue'

/** Client  */

/** Dashboards View */
import Dashboard from '../views/Standard/Dashboard.vue'
import PastMediationsView from '../views/Standard/PastMediationsView.vue'

/** Auth & User Management */
import AgreementSignature from '../views/ClientControllers/AgreementSignature.vue'
import Signature from '../views/ClientControllers/Signature.vue'

/** Blog */
import MyBlogs from '../views/Blog/MyBlogs.vue'
import MyVideoReels from '../views/MediatorControllers/MyVideoReels.vue'

import SignIn from '../views/AuthPages/SignIn.vue'
import SignUp from '../views/AuthPages/SignUp.vue'
import RecoverPassword from '../views/AuthPages/RecoverPassword.vue'
import ProfileEdit from '../views/Standard/ProfileEdit.vue'

import ErrorPage from '../views/Pages/ErrorPage.vue'
import ComingSoon from '../views/Pages/ComingSoon.vue'
import Maintenance from '../views/Pages/Maintenance.vue'
import BlankPage from '../views/Pages/BlankPage.vue'
import ClientCalendar from '../views/ClientControllers/Calendar.vue'
import MediatorCalendar from '../views/MediatorControllers/Calendar.vue'

Vue.use(VueRouter)

const childRoutes = (prop) => [
  {
    path: '',
    name: prop + '.home',
    meta: { adminPage: 'dashboard' },
    component: Dashboard
  }
]
const appChildRoute = (prop) => [
  {
    path: 'past-mediations',
    name: prop + '.past-mediations',
    meta: { name: 'Past Mediations' },
    component: PastMediationsView
  },
  {
    path: 'support',
    name: prop + '.support',
    meta: { name: 'Support' },
    component: PortalSupportView
  },
  {
    path: 'calendar',
    name: prop + '.calendar',
    component: MediatorCalendar
  },
  {
    path: 'calendar2',
    name: prop + '.calendar2',
    component: ClientCalendar
  },
  {
    path: 'signature',
    name: 'signature',
    component: Signature
  },
  {
    path: 'users',
    name: prop + '.users',
    meta: { name: 'Admin Users List', adminPage: 'users' },
    component: AdminUsersListView
  },
  {
    path: 'cases',
    name: prop + '.cases',
    meta: { name: 'Case management', adminPage: 'cases' },
    component: AdminCasesManagementView
  },
  {
    path: 'messages',
    name: prop + '.messages',
    meta: { name: 'Messages', adminPage: 'messages' },
    component: AdminCorrespondenceInbox
  },
  {
    path: 'admin-calendar',
    name: prop + '.admin-calendar',
    meta: { name: 'Meetings calendar', adminPage: 'calendar' },
    component: AdminCalendar
  },
  {
    path: 'google_management',
    name: prop + '.google_management',
    meta: { name: 'Google Account Management', adminPage: 'google' },
    component: GoogleAccountManagement
  },
  {
    path: 'blog-taxonomy',
    name: prop + '.blog-taxonomy',
    meta: { name: 'Blog Taxonomy', adminPage: 'blog-taxonomy' },
    component: AdminBlogTaxonomyView
  },
  {
    path: 'admins',
    name: prop + '.admins',
    meta: { name: 'Admin Management', adminPage: 'admins' },
    component: AdminManagementView
  },
  {
    path: 'settings',
    name: prop + '.settings',
    meta: { name: 'Settings', adminPage: 'settings' },
    component: AdminSettingsView
  },
  {
    path: 'invoices',
    name: prop + '.invoices',
    meta: { name: 'Payments & Invoices', adminPage: 'invoices' },
    component: InvoicesView
  },
  {
    path: 'rewards',
    name: prop + '.rewards',
    meta: { name: 'Reward Store' },
    component: MediatorRewardsView
  },
  {
    path: 'reward-orders',
    name: prop + '.reward-orders',
    meta: { name: 'Reward orders', adminPage: 'reward-orders' },
    component: AdminRewardOrdersView
  },
  {
    path: 'mediators/:mediatorId/360',
    name: prop + '.mediator-360',
    meta: { name: 'Mediator 360', adminPage: 'users' },
    component: AdminMediator360View
  },
  {
    path: 'private-invoices',
    redirect: { name: 'app.invoices' }
  }
]

const blogChildRoutes = (prop) => [
  {
    path: 'list',
    name: prop + '.list',
    component: MyBlogs
  }
]

const reelsChildRoutes = (prop) => [
  {
    path: 'list',
    name: prop + '.list',
    component: MyVideoReels
  }
]

const authChildRoutes = (prop) => [
  {
    path: 'sign-in',
    name: prop + '.sign-in',
    component: SignIn
  },
  {
    path: 'sign-up',
    name: prop + '.sign-up',
    component: SignUp
  },
  {
    path: 'password-reset',
    name: prop + '.password-reset',
    component: RecoverPassword
  }
]

const userChildRoute = (prop) => [
  {
    path: 'profile-edit',
    name: prop + '.edit',
    component: ProfileEdit
  }
]

const defaultlayout = (prop) => [
  {
    path: 'blank-page',
    name: prop + '.blank-page',
    component: BlankPage
  }
]

const pagesChildRoutes = (prop) => [
  {
    path: 'error/:code',
    name: prop + '.error',
    component: ErrorPage
  },
  {
    path: 'coming-soon',
    name: prop + '.coming-soon',
    component: ComingSoon
  },
  {
    path: 'maintenance',
    name: prop + '.maintenance',
    component: Maintenance
  }
]

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: StandardLayout,
    children: childRoutes('dashboard')
  },
  {
    path: '/agreement-signature',
    name: 'agreement-signature',
    component: AgreementSignature
  },
  {
    path: '/auth',
    name: 'auth1',
    component: AuthLayout,
    children: authChildRoutes('auth1')
  },
  {
    path: '/blog',
    name: 'blog',
    component: StandardLayout,
    children: blogChildRoutes('blog')
  },
  {
    path: '/reels',
    name: 'reels',
    component: StandardLayout,
    children: reelsChildRoutes('reels')
  },
  {
    path: '/pages',
    name: 'pages',
    component: Default,
    children: pagesChildRoutes('default')
  },
  {
    path: '/extra-pages',
    name: 'extra-pages',
    component: StandardLayout,
    children: defaultlayout('extra-pages')
  },
  {
    path: '/app',
    name: 'app',
    component: StandardLayout,
    children: appChildRoute('app')
  },
  {
    path: '/user',
    name: 'user',
    component: StandardLayout,
    children: userChildRoute('user')
  }
]

const router = new VueRouter({
  mode: 'history',
  base: '/admin/',
  routes
})

export default router
