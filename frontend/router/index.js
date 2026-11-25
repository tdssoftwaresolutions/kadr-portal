import { createRouter, createWebHistory } from 'vue-router'

/* Layouts — kept eager (shell) */
import StandardLayout from '../layouts/StandardLayout.vue'
import Default from '../layouts/BlankLayout'
import AuthLayout from '../layouts/AuthLayout.vue'

/* Lazy-loaded views.
   Admin and mediator pages each get their own chunk: grouping them under one
   name meant the first click on any admin page downloaded every admin page
   (~280 KB) before it could render. */
const AdminUsersListView = () => import(/* webpackChunkName: "admin-users-list-view" */ '../views/AdminControllers/AdminUsersListView.vue')
const AdminEmailCorrectionsView = () => import(/* webpackChunkName: "admin-email-corrections-view" */ '../views/AdminControllers/AdminEmailCorrectionsView.vue')
const AdminCasesManagementView = () => import(/* webpackChunkName: "admin-cases-management-view" */ '../views/AdminControllers/AdminCasesManagementView.vue')
const GoogleAccountManagement = () => import(/* webpackChunkName: "admin-google-account-management" */ '../views/AdminControllers/GoogleAccountManagement.vue')
const AdminBlogTaxonomyView = () => import(/* webpackChunkName: "admin-blog-taxonomy-view" */ '../views/AdminControllers/AdminBlogTaxonomyView.vue')
const AdminManagementView = () => import(/* webpackChunkName: "admin-management-view" */ '../views/AdminControllers/AdminManagementView.vue')
const AdminSettingsView = () => import(/* webpackChunkName: "admin-settings-view" */ '../views/AdminControllers/AdminSettingsView.vue')
const AdminNotificationsView = () => import(/* webpackChunkName: "admin-notifications-view" */ '../views/AdminControllers/AdminNotificationsView.vue')
const AdminWebsiteContentView = () => import(/* webpackChunkName: "admin-website-content-view" */ '../views/AdminControllers/AdminWebsiteContentView.vue')
const AdminCalendar = () => import(/* webpackChunkName: "admin-calendar" */ '../views/AdminControllers/AdminCalendar.vue')
const AdminCorrespondenceInbox = () => import(/* webpackChunkName: "admin-correspondence-inbox" */ '../views/AdminControllers/AdminCorrespondenceInbox.vue')
const AdminRewardOrdersView = () => import(/* webpackChunkName: "admin-reward-orders-view" */ '../views/AdminControllers/AdminRewardOrdersView.vue')
const AdminMediator360View = () => import(/* webpackChunkName: "admin-mediator360-view" */ '../views/AdminControllers/AdminMediator360View.vue')

const InvoicesView = () => import(/* webpackChunkName: "mediator-invoices-view" */ '../views/MediatorControllers/InvoicesView.vue')
const MediatorRewardsView = () => import(/* webpackChunkName: "mediator-rewards-view" */ '../views/MediatorControllers/MediatorRewardsView.vue')
const MediatorCalendar = () => import(/* webpackChunkName: "mediator-calendar" */ '../views/MediatorControllers/Calendar.vue')
const MyVideoReels = () => import(/* webpackChunkName: "mediator-my-video-reels" */ '../views/MediatorControllers/MyVideoReels.vue')

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
    path: 'email-corrections',
    name: prop + '.email-corrections',
    meta: { name: 'Email Corrections', adminPage: 'email-corrections' },
    component: AdminEmailCorrectionsView
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

const authRoute = (path, name, component, props) => {
  const childRoute = { path: '', name, component }
  if (props) childRoute.props = props
  return { path, component: AuthLayout, children: [childRoute] }
}

const blankRoute = (path, name, component, props) => ({
  path,
  component: Default,
  children: [{ path: '', name, component, props }]
})

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

const routes = [
  {
    path: '/',
    name: 'portal',
    component: StandardLayout,
    children: [
      ...childRoutes('dashboard'),
      ...appChildRoute('app'),
      ...userChildRoute('user'),
      { path: 'blog', name: 'blog.list', component: MyBlogs },
      { path: 'reels', name: 'reels.list', component: MyVideoReels },
      { path: 'blank-page', name: 'extra-pages.blank-page', component: BlankPage }
    ]
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
  authRoute('/sign-in', 'auth1.sign-in', SignIn),
  authRoute('/sign-up', 'auth1.sign-up', SignUp),
  authRoute('/mediator-sign-up', 'auth1.mediator-sign-up', SignUp, { mediatorOnly: true }),
  authRoute('/password-reset', 'auth1.password-reset', RecoverPassword),
  blankRoute('/error/:code', 'default.error', ErrorPage, true),
  blankRoute('/coming-soon', 'default.coming-soon', ComingSoon),
  blankRoute('/maintenance', 'default.maintenance', Maintenance),
  { path: '/auth/:pathMatch(.*)*', redirect: to => ({ path: to.path.replace(/^\/auth/, '') || '/sign-in', query: to.query, hash: to.hash }) },
  { path: '/app/:pathMatch(.*)*', redirect: to => ({ path: to.path.replace(/^\/app/, '') || '/', query: to.query, hash: to.hash }) },
  { path: '/user/:pathMatch(.*)*', redirect: to => ({ path: to.path.replace(/^\/user/, '') || '/', query: to.query, hash: to.hash }) },
  { path: '/pages/:pathMatch(.*)*', redirect: to => ({ path: to.path.replace(/^\/pages/, '') || '/', query: to.query, hash: to.hash }) },
  { path: '/extra-pages/:pathMatch(.*)*', redirect: to => ({ path: to.path.replace(/^\/extra-pages/, '') || '/', query: to.query, hash: to.hash }) },
  { path: '/blog/list', redirect: { name: 'blog.list' } },
  { path: '/reels/list', redirect: { name: 'reels.list' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: ErrorPage, props: { code: 404 } }
]

const routerBase = process.env.VUE_APP_CAPACITOR === '1' ? './' : '/portal/'

const router = createRouter({
  history: createWebHistory(routerBase),
  routes
})

export default router
