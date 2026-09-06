// Decouples the axios layer (utils/apiClient.js) from the Vuex store.
//
// The store modules import apiClient, so apiClient importing the store back
// would create a circular dependency. Instead, main.js registers the store
// here once it's created, and the interceptors call begin/end through this
// bridge. Before registration (or if the store is unavailable) the calls are
// safe no-ops.

let store = null

export function registerLoadingStore (vuexStore) {
  store = vuexStore
}

export function notifyRequestStart () {
  if (store) store.dispatch('spinner/beginRequest')
}

export function notifyRequestEnd () {
  if (store) store.dispatch('spinner/endRequest')
}
