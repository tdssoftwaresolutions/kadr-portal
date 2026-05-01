<template>
  <b-collapse tag="ul" :class="className" :visible="open" :id="idName" :accordion="accordianName">
    <li
      v-for="(item, index) in items"
      :key="index"
      :class="menuItemClass(item)"
    >
      <i v-if="item.is_heading" class="ri-subtract-line" />
      <span v-if="item.is_heading">{{ item.title }}</span>
      <router-link
        v-if="!item.is_heading"
        :to="item.link"
        :title="depth === 0 ? item.title : null"
        :class="menuLinkClass(item)"
      >
        <span class="menu-icon-wrap">
          <i :class="item.icon" v-if="item.is_icon_class" style="margin-right: 0px;"/>
          <template v-else v-html="item.icon"></template>
        </span>
        <span class="menu-title">{{ item.title }}</span>
        <i v-if="item.children" class="ri-arrow-right-s-line iq-arrow-right" />
        <small v-html="item.append" :class="item.append_class" />
      </router-link>
      <List
        v-if="item.children"
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
  mounted () {
  },
  methods: {
    menuItemClass (item) {
      if (item.is_heading) {
        return 'iq-menu-title'
      }

      return {
        active: this.activeLink(item),
        'has-children': !!item.children,
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
        'child-link': this.depth > 0
      }
    },
    activeLink (item) {
      return sofbox.getActiveLink(item, this.$route.name)
    }
  }
}
</script>
