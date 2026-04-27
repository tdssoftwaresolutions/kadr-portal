export default {
  namespaced: true,
  state: () => ({
    visible: false,
    message: '',
    timeout: 5000,
    type: 'info' // 'success' | 'error' | 'warning' | 'info'
  }),
  mutations: {
    SHOW_ALERT (state, { message, type }) {
      state.visible = true
      state.message = message
      state.type = type
    },
    HIDE_ALERT (state) {
      state.visible = false
      state.message = ''
      state.type = 'info'
    }
  },
  actions: {
    showAlert ({ commit }, { message, type = 'error' }) {
      commit('SHOW_ALERT', { message, type })
      // Optionally auto-hide after timeout
      setTimeout(() => commit('HIDE_ALERT'), 5000)
    },
    hideAlert ({ commit }) {
      commit('HIDE_ALERT')
    }
  }
}
