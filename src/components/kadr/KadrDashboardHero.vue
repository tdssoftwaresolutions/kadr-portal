<template>
  <div class="hero-card">
    <div class="hero-profile">
      <img
        :src="avatarSrc"
        class="hero-avatar"
        alt="Profile picture"
      >
      <div class="hero-user-meta">
        <h3>{{ greeting }}</h3>
        <p v-if="email">{{ email }}</p>
      </div>
    </div>

    <div v-if="stats && stats.length" class="hero-stats" :style="statsGridStyle">
      <div
        v-for="(stat, index) in stats"
        :key="stat.key || index"
        class="stat-card"
        :class="{ 'stat-card-link': !!stat.onClick }"
        :role="stat.onClick ? 'button' : null"
        :tabindex="stat.onClick ? 0 : null"
        :title="stat.title || null"
        @click="stat.onClick && stat.onClick()"
        @keydown.enter="stat.onClick && stat.onClick()"
      >
        <span class="stat-label">{{ stat.label }}</span>
        <span class="stat-value">{{ formatValue(stat.value) }}</span>
        <span v-if="stat.hint" class="stat-hint">{{ stat.hint }}</span>
      </div>
    </div>
    <slot name="extra" />
  </div>
</template>

<script>
const DEFAULT_AVATAR = require('../../assets/images/default_avatar.jpeg')

export default {
  name: 'KadrDashboardHero',
  props: {
    name: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    stats: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    greeting () {
      return this.name ? `Welcome back, ${this.name}` : 'Welcome back'
    },
    avatarSrc () {
      return this.avatarUrl || DEFAULT_AVATAR
    },
    statsGridStyle () {
      const count = Math.max(this.stats.length, 1)
      if (count <= 3) return {}
      return { maxWidth: 'none', gridTemplateColumns: `repeat(${Math.min(count, 4)}, minmax(120px, 1fr))` }
    }
  },
  methods: {
    formatValue (value) {
      if (typeof value === 'number') {
        return value.toLocaleString()
      }
      return value
    }
  }
}
</script>
