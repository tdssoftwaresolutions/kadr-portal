import { createRouter, createWebHistory } from 'vue-router'

/* Layouts — kept eager (shell) */
import StandardLayout from '../layouts/StandardLayout.vue'
import Default from '../layouts/BlankLayout'
import AuthLayout from '../layouts/AuthLayout.vue'

/* Lazy-loaded views */
const AdminUsersListView = () => import(/* webpackChunkName: "admin" */ '../views/AdminControllers/AdminUsersListView.vue')
const AdminCasesManagementView = () => import(/* webpackChunkName: "admin" */ '../views/AdminControllers/AdminCasesManagementView.vue')
const GoogleAccountManagement = () => import(/* webpackChunkName: "admin" */ '../views/AdminControllers/GoogleAccountManagement.vue')
const AdminBlogTaxonomyView = () => import(/* webpackChunkName: "admin" */ '../views/AdminControllers/AdminBlogTaxonomyView.vue')
const AdminManagementView = () => import(/* webpackChunkName: "admin" */ '../views/AdminControllers/AdminManagementView.vue')
const AdminSettingsView = () => import(/* webpackChunkName: "admin" */ '../views/AdminControllers/AdminSettingsView.vue')
const AdminNotificationsView = () => import(/* webpackChunkName: "admin" */ '../views/AdminControllers/AdminNotificationsView.vue')
const AdminWebsiteContentView = () => import(/* webpackChunkName: "admin" */ '../views/AdminControllers/AdminWebsiteContentView.vue')
const AdminCalendar = () => import(/* webpackChunkName: "admin" */ '../views/AdminControllers/AdminCalendar.vue')
const AdminCorrespondenceInbox = () => import(/* webpackChunkName: "admin" */ '../views/AdminControllers/AdminCorrespondenceInbox.vue')
const AdminRewardOrdersView = () => import(/* webpackChunkName: "admin" */ '../views/AdminControllers/AdminRewardOrdersView.vue')
const AdminMediator360View = () => import(/* webpackChunkName: "admin" */ '../views/AdminControllers/AdminMediator360View.vue')

const InvoicesView = () => import(/* webpackChunkName: "mediator" */ '../views/MediatorControllers/InvoicesView.vue')
const MediatorRewardsView = () => import(/* webpackChunkName: "mediator" */ '../views/MediatorControllers/MediatorRewardsView.vue')
const MediatorCalendar = () => import(/* webpackChunkName: "mediator" */ '../views/MediatorControllers/Calendar.vue')
const MyVideoReels = () => import(/* webpackChunkName: "mediator" */ '../views/MediatorControllers/MyVideoReels.vue')

const Dashboard = () => import(/* webpackChunkName: "dashboard" */ '../views/Standard/Dashboard.vue')
const PastMediationsView = () => import(/* webpackChunkName: "dashboard" */ '../views/Standard/PastMediationsView.vue')
const PortalSupportView = () => import(/* webpackChunkName: "dashboard" */ '../views/Standard/PortalSupportView.vue')
const PaymentReturn = () => import(/* webpackChunkName: "dashboard" */ '../views/Standard/PaymentReturn.vue')
const ProfileEdit = () => import(/* webpackChunkName: "user" */ '../views/Standard/ProfileEdit.vue')
const NotificationSettings = () => import(/* webpackChunkName: "user" */ '../views/Standard/NotificationSettings.vue')

const AgreementSignature = () => import(/* webpackChunkName: "client" */ '../views/ClientControllers/AgreementSignature.vue')
const Signature = () => import(/* webpackChunkName: "client" */ '../views/ClientControllers/Signature.vue')
const ClientCalendar = () => import(/* webpackChunkName: "client" */ '../views/ClientControllers/Calendar.vue')

const MyBlogs = () => import(/* webpackChunkName: "blog" */ '../views/Blog/MyBlogs.vue')

const SignIn = () => import(/* webpackChunkName: "auth" */ '../views/AuthPages/SignIn.vue')
const SignUp = () => import(/* webpackChunkName: "auth" */ '../views/AuthPages/SignUp.vue')
const RecoverPassword = () => import(/* webpackChunkName: "auth" */ '../views/AuthPages/RecoverPassword.vue')

const ErrorPage = () => import(/* webpackChunkName: "pages" */ '../views/Pages/ErrorPage.vue')
const ComingSoon = () => import(/* webpackChunkName: "pages" */ '../views/Pages/ComingSoon.vue')
const Maintenance = () => import(/* webpackChunkName: "pages" */ '../views/Pages/Maintenance.vue')
const BlankPage = () => import(/* webpackChunkName: "pages" */ '../views/Pages/BlankPage.vue')

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
    path: 'payment/return',
    name: prop + '.payment-return',
    meta: { name: 'Payment confirmation' },
    component: PaymentReturn
  },
  {
    path: 'calendar',
    name: prop + '.calendar',
    component: MediatorCalendar
  },
  {
    path: 'client-calendar',
    name: prop + '.client-calendar',
    component: ClientCalendar
  },
  {
    // Legacy name used by older bookmarks / nav configs
    path: 'calendar2',
    name: prop + '.calendar2',
    redirect: { name: prop + '.client-calendar' }
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
    path: 'notifications',
    name: prop + '.notifications',
    meta: { name: 'Notifications', adminPage: 'notifications' },
    component: AdminNotificationsView
  },
  {
    path: 'website-content',
    name: prop + '.website-content',
    meta: { name: 'Website content', adminPage: 'website-content' },
    component: AdminWebsiteContentView
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
  },
  {
    path: 'notification-settings',
    name: prop + '.notifications',
    meta: { name: 'Notification settings' },
    component: NotificationSettings
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
    path: '/signature',
    name: 'signature',
    component: Signature
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

const routerBase = process.env.VUE_APP_CAPACITOR === '1' ? './' : '/admin/'

const router = createRouter({
  history: createWebHistory(routerBase),
  routes
})

export default router
