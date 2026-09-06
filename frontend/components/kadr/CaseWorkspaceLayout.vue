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
          <!-- Tabbed layout: render a tab bar + the active panel when `tabs`
               are provided. Falls back to the plain #main slot otherwise, so
               existing callers keep working unchanged. -->
          <template v-if="tabs && tabs.length">
            <div class="workspace-tabs" role="tablist" aria-label="Case sections">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                type="button"
                role="tab"
                class="workspace-tab"
                :class="{ 'is-active': activeTab === tab.key }"
                :aria-selected="activeTab === tab.key"
                @click="activeTab = tab.key"
              >
                <i v-if="tab.icon" :class="tab.icon" aria-hidden="true"></i>
                <span>{{ tab.label }}</span>
                <span v-if="tab.badge" class="workspace-tab-badge">{{ tab.badge }}</span>
              </button>
            </div>
            <div :key="activeTab" class="workspace-tab-panel kadr-fade-in">
              <slot :name="`tab-${activeTab}`" />
            </div>
          </template>
          <slot v-else name="main" />
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
    },
    /**
     * Optional tab definitions: [{ key, label, icon?, badge? }].
     * When provided, the main area renders a tab bar and one `#tab-<key>`
     * panel at a time (reduces scrolling on dense case screens).
     */
    tabs: {
      type: Array,
      default: null
    },
    /** Which tab key to open first / to control from the parent. */
    initialTab: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      activeTab: this.initialTab || (this.tabs && this.tabs.length ? this.tabs[0].key : '')
    }
  },
  watch: {
    // Keep a valid active tab if the tab set changes (e.g. past vs active view).
    tabs (next) {
      if (!next || !next.length) return
      if (!next.some((t) => t.key === this.activeTab)) {
        this.activeTab = next[0].key
      }
    },
    initialTab (val) {
      if (val) this.activeTab = val
    }
  }
}
</script>
