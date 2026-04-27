export default {
  namespaced: true,
  state: () => ({
    spinner: false
  }),
  mutations: {
    SHOW_SPINNER (state) {
      state.spinner = true
    },
    HIDE_SPINNER (state) {
      state.spinner = false
    }
  },
  actions: {
    showSpinner ({ commit }) {
      commit('SHOW_SPINNER')
    },
    hideSpinner ({ commit }) {
      commit('HIDE_SPINNER')
    }
  }
}
