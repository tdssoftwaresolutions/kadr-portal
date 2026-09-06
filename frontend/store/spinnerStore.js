// Global loading spinner state.
//
// Driven by a pending-request COUNTER rather than a boolean so that concurrent
// API calls don't race (one finishing must not hide the spinner while others
// are still in flight). The axios interceptors in utils/apiClient.js call
// `beginRequest` / `endRequest` around every non-silent request.
//
// A short show-delay avoids flashing the full-screen overlay for fast calls:
// the spinner only becomes visible if requests are still pending after
// SHOW_DELAY_MS. `spinner` (the boolean the UI binds to) reflects that
// delayed, debounced visibility.

const SHOW_DELAY_MS = 250

// Timer handle + a plain mirror of the pending count kept outside Vuex state
// (neither is reactive UI data). The mirror lets the delayed show-timer check
// the live count without depending on `this` binding inside the callback.
let showTimer = null
let pendingCount = 0

export default {
  namespaced: true,
  state: () => ({
    // Number of in-flight, non-silent requests.
    pending: 0,
    // Whether the overlay should actually be shown (set after SHOW_DELAY_MS).
    spinner: false
  }),
  mutations: {
    INCREMENT_PENDING (state) {
      state.pending += 1
    },
    DECREMENT_PENDING (state) {
      state.pending = Math.max(0, state.pending - 1)
    },
    SET_VISIBLE (state, visible) {
      state.spinner = visible
    },
    RESET (state) {
      state.pending = 0
      state.spinner = false
    },
    // Backwards-compatible boolean setters (see showSpinner/hideSpinner below).
    SHOW_SPINNER (state) {
      state.spinner = true
    },
    HIDE_SPINNER (state) {
      state.spinner = false
    }
  },
  actions: {
    // Called by the axios request interceptor for every tracked request.
    beginRequest ({ commit, state }) {
      pendingCount += 1
      commit('INCREMENT_PENDING')
      // Schedule showing the overlay only if still pending after the delay,
      // so quick requests never flash it.
      if (!showTimer && !state.spinner) {
        showTimer = setTimeout(() => {
          showTimer = null
          // Re-check the live count at fire time; it may have dropped to 0.
          if (pendingCount > 0) {
            commit('SET_VISIBLE', true)
          }
        }, SHOW_DELAY_MS)
      }
    },
    // Called by the axios response/error interceptors for every tracked request.
    endRequest ({ commit }) {
      pendingCount = Math.max(0, pendingCount - 1)
      commit('DECREMENT_PENDING')
      if (pendingCount === 0) {
        if (showTimer) {
          clearTimeout(showTimer)
          showTimer = null
        }
        commit('SET_VISIBLE', false)
      }
    },
    // Clears everything (e.g. on logout / hard navigation) to avoid a stuck
    // overlay if a counter ever gets out of sync.
    resetSpinner ({ commit }) {
      pendingCount = 0
      if (showTimer) {
        clearTimeout(showTimer)
        showTimer = null
      }
      commit('RESET')
    },
    // --- Backwards compatibility --------------------------------------------
    // The app previously drove the spinner manually from ~40 Vuex actions via
    // these actions. Global tracking now lives in the axios interceptors, so
    // these are intentionally no-ops: leaving them callable means none of the
    // existing dispatch('spinner/showSpinner') / hideSpinner() calls break or
    // double-count against the counter.
    showSpinner () {},
    hideSpinner () {}
  }
}
