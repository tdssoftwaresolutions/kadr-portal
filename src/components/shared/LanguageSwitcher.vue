<template>
  <div class="language-switcher d-inline-block">
    <b-dropdown
      :text="currentLabel"
      size="sm"
      variant="outline-secondary"
      right
    >
      <b-dropdown-item
        v-for="locale in $i18n.availableLocales"
        :key="locale"
        :active="locale === $i18n.locale"
        @click="switchLocale(locale)"
      >
        {{ localeLabels[locale] }}
      </b-dropdown-item>
    </b-dropdown>
  </div>
</template>

<script>
export default {
  name: 'LanguageSwitcher',
  data () {
    return {
      localeLabels: {
        en: 'English',
        hi: 'हिन्दी'
      }
    }
  },
  computed: {
    currentLabel () {
      return this.localeLabels[this.$i18n.locale] || 'English'
    }
  },
  methods: {
    switchLocale (locale) {
      this.$i18n.locale = locale
      this.$forceUpdate()
    }
  }
}
</script>

<style scoped>
.language-switcher {
  margin-left: 8px;
}
</style>
