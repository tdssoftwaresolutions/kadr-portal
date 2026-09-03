<template>
  <b-collapse tag="ul" :class="className" :visible="open" :id="idName" :accordion="accordianName">
    <li
      v-for="(item, index) in items"
      :key="index"
      :class="menuItemClass(item)"
    >
      <i v-if="item.is_heading" class="ri-subtract-line" />
      <span v-if="item.is_heading">{{ label(item) }}</span>
      <router-link
        v-if="!item.is_heading && !isGroup(item)"
        :to="item.link"
        :title="depth === 0 ? label(item) : null"
        :data-flyout-label="depth === 0 ? label(item) : null"
        :class="menuLinkClass(item)"
      >
        <span class="menu-icon-wrap">
          <i :class="item.icon" v-if="item.is_icon_class" style="margin-right: 0px;"/>
          <template v-else v-html="item.icon"></template>
        </span>
        <span class="menu-title">{{ label(item) }}</span>
        <small v-html="item.append" :class="item.append_class" />
      </router-link>
      <button
        v-else-if="!item.is_heading && isGroup(item)"
        type="button"
        :data-flyout-label="depth === 0 ? label(item) : null"
        :title="depth === 0 ? label(item) : null"
        :aria-label="label(item)"
        :aria-expanded="isGroupOpen(item)"
        :class="menuLinkClass(item)"
      >
        <span class="menu-icon-wrap">
          <i :class="item.icon" v-if="item.is_icon_class" style="margin-right: 0px;"/>
          <template v-else v-html="item.icon"></template>
        </span>
        <span class="menu-title">{{ label(item) }}</span>
        <i class="ri-arrow-right-s-line iq-arrow-right menu-group-chevron" />
        <small v-html="item.append" :class="item.append_class" />
      </button>
      <List
        v-if="item.children && item.children.length"
        :items="item.children"
        :open="true"
        :depth="depth + 1"
        :idName="item.name"
        :accordianName="`sidebar-accordion ${item.class_name}`"
        :className="`iq-submenu ${item.class_name}`"
      />
    </li>
  </b-collapse>
</template>
<script>
import List from './ListStyle1'
import { sofbox } from '../../../config/pluginInit'
export default {
  name: 'List',
  props: {
    items: Array,
    className: { type: String, default: 'iq-menu' },
    horizontal: Boolean,
    open: { type: Boolean, default: false },
    idName: { type: String, default: 'sidebar' },
    accordianName: { type: String, default: 'sidebar' },
    depth: { type: Number, default: 0 }
  },
  components: {
    List
  },
  methods: {
    // Resolve a menu item's display label. When the item carries an `i18nKey`
    // (admin sidebar), translate it via $t so it updates live when the locale
    // changes. Falls back to the static `title` when there's no key or the key
    // is missing from the dictionary (client/mediator sidebars keep working).
    label (item) {
      // Read the reactive locale so this binding re-evaluates on every locale
      // change, including in recursively-rendered child <List> instances.
      const locale = this.$i18n && this.$i18n.locale // eslint-disable-line no-unused-vars
      if (item.i18nKey && typeof this.$t === 'function') {
        const translated = this.$t(item.i18nKey)
        if (translated && translated !== item.i18nKey) return translated
      }
      return item.title
    },
    isGroup (item) {
      return !!(item.children && item.children.length && (!item.link || item.is_group))
    },
    menuItemClass (item) {
      if (item.is_heading) {
        return 'iq-menu-title'
      }

      return {
        active: this.activeLink(item),
        'has-children': this.isGroup(item),
        'is-group-item': this.isGroup(item),
        'is-root-item': this.depth === 0,
        'is-child-item': this.depth > 0
      }
    },
    menuLinkClass (item) {
      return {
        'iq-waves-effect': true,
        active: this.activeLink(item),
        'sidebar-link': true,
        'root-link': this.depth === 0,
        'child-link': this.depth > 0,
        'menu-group-trigger': this.isGroup(item)
      }
    },
    isGroupOpen (item) {
      return this.activeLink(item)
    },
    activeLink (item) {
      return sofbox.getActiveLink(item, this.$route.name)
    }
  }
}
</script>
