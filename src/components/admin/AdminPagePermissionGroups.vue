<template>
  <div class="admin-page-perm-groups">
    <div v-if="standalonePages.length" class="admin-perm-group admin-perm-standalone mb-3">
      <b-form-checkbox-group
        :checked="value"
        :options="standaloneOptions"
        stacked
        @input="onPagesInput"
      />
    </div>

    <div
      v-for="group in pageGroups"
      :key="group.key"
      class="admin-perm-group mb-3"
    >
      <div class="admin-perm-group-head">
        <span class="perm-section-title">{{ group.label }}</span>
        <b-button
          size="sm"
          variant="link"
          class="p-0 admin-perm-group-toggle"
          @click="toggleGroup(group)"
        >
          {{ groupToggleLabel(group) }}
        </b-button>
      </div>
      <b-form-checkbox-group
        :checked="value"
        :options="groupOptions(group)"
        stacked
        class="admin-perm-group-options"
        @input="onPagesInput"
      />
    </div>
  </div>
</template>

<script>
import { ADMIN_PAGE_GROUPS, ADMIN_STANDALONE_PAGES } from '../../constants/adminPermissionCatalog'

export default {
  name: 'AdminPagePermissionGroups',
  props: {
    value: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    standalonePages () {
      return ADMIN_STANDALONE_PAGES
    },
    pageGroups () {
      return ADMIN_PAGE_GROUPS
    },
    standaloneOptions () {
      return this.standalonePages.map((p) => ({ value: p.key, text: p.label }))
    }
  },
  methods: {
    onPagesInput (pages) {
      this.$emit('input', pages)
    },
    groupOptions (group) {
      return group.pages.map((p) => ({ value: p.key, text: p.label }))
    },
    groupKeys (group) {
      return group.pages.map((p) => p.key)
    },
    isGroupFullySelected (group) {
      const keys = this.groupKeys(group)
      return keys.length > 0 && keys.every((k) => this.value.includes(k))
    },
    groupToggleLabel (group) {
      return this.isGroupFullySelected(group) ? 'Clear group' : 'Select all'
    },
    toggleGroup (group) {
      const keys = this.groupKeys(group)
      const next = new Set(this.value)
      if (this.isGroupFullySelected(group)) {
        keys.forEach((k) => next.delete(k))
      } else {
        keys.forEach((k) => next.add(k))
      }
      this.$emit('input', [...next])
    }
  }
}
</script>

<style scoped>
.admin-perm-group {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  background: rgba(0, 132, 255, 0.03);
}

.admin-perm-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}

.admin-perm-group-toggle {
  font-size: 0.8rem;
  white-space: nowrap;
}

.perm-section-title {
  font-weight: 600;
  font-size: 0.9rem;
  margin: 0;
}

.admin-perm-group-options >>> .custom-control {
  margin-bottom: 0.35rem;
}
</style>
