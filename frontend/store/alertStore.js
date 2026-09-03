export default {
  namespaced: true,
  state: () => ({
    visible: false,
    message: '',
    timeout: 5000,
    // Both 'error' and 'danger' work — Alert.vue maps error → danger for Bootstrap classes
    type: 'info' // 'success' | 'error' | 'danger' | 'warning' | 'info'
  }),
  mutations: {
    SHOW_ALERT (state, { message, type }) {
      state.visible = true
      state.message = message
      // Accept both 'error' and 'danger' without rejecting either
      state.type = type || 'error'
    },
    HIDE_ALERT (state) {
      state.visible = false
      state.message = ''
      state.type = 'info'
    }
  },
  actions: {
    showAlert ({ commit }, { message, type = 'error' }) {
      // Both 'error' and 'danger' work (Alert.vue already maps error → danger)
      commit('SHOW_ALERT', { message, type })
      // Optionally auto-hide after timeout
      setTimeout(() => commit('HIDE_ALERT'), 5000)
    },
    hideAlert ({ commit }) {
      commit('HIDE_ALERT')
    }
  }
}
