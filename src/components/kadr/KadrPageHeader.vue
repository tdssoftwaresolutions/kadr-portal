<template>
  <header class="kadr-page-header">
    <nav v-if="breadcrumbs && breadcrumbs.length" class="kadr-page-header__breadcrumbs" aria-label="Breadcrumb">
      <template v-for="(crumb, index) in breadcrumbs">
        <router-link
          v-if="crumb.to && index < breadcrumbs.length - 1"
          :key="`link-${index}`"
          :to="crumb.to"
        >
          {{ crumb.label }}
        </router-link>
        <span v-else :key="`text-${index}`">{{ crumb.label }}</span>
        <span v-if="index < breadcrumbs.length - 1" :key="`sep-${index}`"> / </span>
      </template>
    </nav>
    <div class="kadr-page-header__row">
      <div>
        <h1 class="kadr-page-header__title">{{ title }}</h1>
        <p v-if="subtitle" class="kadr-page-header__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="kadr-page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<script>
export default {
  name: 'KadrPageHeader',
  props: {
    title: {
      type: String,
      required: true
    },
    subtitle: {
      type: String,
      default: ''
    },
    breadcrumbs: {
      type: Array,
      default: null
    }
  }
}
</script>
