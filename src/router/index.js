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
/** Mediator */

/** Client  */

/** Dashboards View */
import Dashboard from '../views/Standard/Dashboard.vue'

/** Auth & User Management */

/** Blog */
import MyBlogs from '../views/Blog/MyBlogs.vue'

import SignIn from '../views/AuthPages/SignIn.vue'
import SignUp from '../views/AuthPages/SignUp.vue'
import RecoverPassword from '../views/AuthPages/RecoverPassword.vue'
import ProfileEdit from '../views/Standard/ProfileEdit.vue'

import ErrorPage from '../views/Pages/ErrorPage'
import ComingSoon from '../views/Pages/ComingSoon'
import Maintenance from '../views/Pages/Maintenance'
import BlankPage from '../views/Pages/BlankPage'
import FAQ from '../views/Pages/FAQ'
import Invoice from '../views/Pages/Invoice'
import ClientCalendar from '../views/ClientControllers/Calendar.vue'
import MediatorCalendar from '../views/MediatorControllers/Calendar.vue'
import ECommerceListing from '../views/Apps/Ecommerce/Listing.vue'
import EditableTable from '../views/Tables/EditableTable'

Vue.use(VueRouter)

const childRoutes = (prop) => [
  {
    path: '',
    name: prop + '.home',
    component: Dashboard
  }
]
const appChildRoute = (prop) => [
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
    path: 'e-commerce/listing',
    name: prop + '.e-commerce.index',
    meta: { name: 'Product list' },
    component: ECommerceListing
  },
  {
    path: 'users',
    name: prop + '.users',
    meta: { name: 'Admin Users List' },
    component: AdminUsersListView
  },
  {
    path: 'cases',
    name: prop + '.cases',
    meta: { name: 'Case management' },
    component: AdminCasesManagementView
  },
  {
    path: 'google_management',
    name: prop + '.google_management',
    meta: { name: 'Google Account Management' },
    component: GoogleAccountManagement
  }
]

const blogChildRoutes = (prop) => [
  {
    path: 'list',
    name: prop + '.list',
    component: MyBlogs
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
    path: 'invoice',
    name: prop + '.invoice',
    component: Invoice
  },
  {
    path: 'blank-page',
    name: prop + '.blank-page',
    component: BlankPage
  },
  {
    path: 'faq',
    name: prop + '.faq',
    component: FAQ
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

const tableChildRoute = (prop) => [
  {
    path: 'editable',
    name: prop + '.editable',
    component: EditableTable
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
    path: '/table',
    name: 'table',
    component: StandardLayout,
    children: tableChildRoute('table')
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
