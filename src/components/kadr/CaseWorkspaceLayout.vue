<template>
  <div id="cases-workspace" class="cases-workspace">
    <section v-if="hasCases" class="cases-overview">
      <div class="overview-head">
        <h4>{{ title }}</h4>
        <p v-if="subtitle">{{ subtitle }}</p>
        <slot name="head-extra" />
      </div>

      <div v-if="$slots.selector" class="case-selector">
        <slot name="selector" />
      </div>

      <div class="workspace-layout">
        <div class="workspace-main">
          <slot name="main" />
        </div>
        <div v-if="$slots.side" class="workspace-side-stack">
          <slot name="side" />
        </div>
      </div>
    </section>

    <kadr-empty-state
      v-else
      :icon="emptyIcon"
      :title="emptyTitle"
      :description="emptyDescription"
      :action-label="emptyActionLabel"
      @action="$emit('empty-action')"
    />
  </div>
</template>

<script>
import KadrEmptyState from './KadrEmptyState.vue'
import { CASES } from '../../constants/messages'

export default {
  name: 'CaseWorkspaceLayout',
  components: { KadrEmptyState },
  props: {
    hasCases: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: CASES.ACTIVE_TITLE
    },
    subtitle: {
      type: String,
      default: CASES.ACTIVE_SUBTITLE
    },
    emptyIcon: {
      type: String,
      default: 'fas fa-folder-open'
    },
    emptyTitle: {
      type: String,
      default: CASES.EMPTY_TITLE
    },
    emptyDescription: {
      type: String,
      default: CASES.EMPTY_DESCRIPTION
    },
    emptyActionLabel: {
      type: String,
      default: ''
    }
  }
}
</script>
