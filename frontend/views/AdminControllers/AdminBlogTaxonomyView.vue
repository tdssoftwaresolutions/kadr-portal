<template>
  <b-container fluid>
    <b-row>
      <b-col md="6">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Blog Categories</h4>
          </template>
          <template v-slot:body>
            <div class="d-flex mb-3">
              <b-form-input v-model="newCategory" placeholder="Add category" />
              <b-button class="ms-2" variant="primary" @click="createCategory">Add</b-button>
            </div>
            <div v-for="item in categories" :key="item.id" class="d-flex align-items-center mb-2">
              <b-form-input v-model="item.name" />
              <small class="mx-2 text-muted">Used: {{ item._count.blog_categories }}</small>
              <b-button size="sm" variant="outline-primary" class="me-2" @click="updateCategory(item)">Save</b-button>
              <b-button size="sm" variant="outline-danger" @click="deleteCategory(item.id)">Delete</b-button>
            </div>
          </template>
        </iq-card>
      </b-col>
      <b-col md="6">
        <iq-card>
          <template v-slot:headerTitle>
            <h4 class="card-title">Blog Tags</h4>
          </template>
          <template v-slot:body>
            <div class="d-flex mb-3">
              <b-form-input v-model="newTag" placeholder="Add tag" />
              <b-button class="ms-2" variant="primary" @click="createTag">Add</b-button>
            </div>
            <div v-for="item in tags" :key="item.id" class="d-flex align-items-center mb-2">
              <b-form-input v-model="item.name" />
              <small class="mx-2 text-muted">Used: {{ item._count.blog_tags }}</small>
              <b-button size="sm" variant="outline-primary" class="me-2" @click="updateTag(item)">Save</b-button>
              <b-button size="sm" variant="outline-danger" @click="deleteTag(item.id)">Delete</b-button>
            </div>
          </template>
        </iq-card>
      </b-col>
    </b-row>
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'

export default {
  name: 'AdminBlogTaxonomyView',
  data () {
    return {
      categories: [],
      tags: [],
      newCategory: '',
      newTag: ''
    }
  },
  mounted () {
    sofbox.index()
    this.fetchTaxonomy()
  },
  methods: {
    async fetchTaxonomy () {
      const response = await this.$store.dispatch('getAdminBlogTaxonomy')
      if (response.success) {
        this.categories = response.data.categories || []
        this.tags = response.data.tags || []
      }
    },
    async createCategory () {
      if (!this.newCategory.trim()) return
      const response = await this.$store.dispatch('createBlogCategory', { name: this.newCategory })
      if (response.success) {
        this.newCategory = ''
        this.fetchTaxonomy()
      }
    },
    async updateCategory (item) {
      const response = await this.$store.dispatch('updateBlogCategory', { id: item.id, name: item.name })
      if (response.success) this.fetchTaxonomy()
    },
    async deleteCategory (id) {
      const response = await this.$store.dispatch('deleteBlogCategory', { id })
      if (response.success) this.fetchTaxonomy()
    },
    async createTag () {
      if (!this.newTag.trim()) return
      const response = await this.$store.dispatch('createBlogTag', { name: this.newTag })
      if (response.success) {
        this.newTag = ''
        this.fetchTaxonomy()
      }
    },
    async updateTag (item) {
      const response = await this.$store.dispatch('updateBlogTag', { id: item.id, name: item.name })
      if (response.success) this.fetchTaxonomy()
    },
    async deleteTag (id) {
      const response = await this.$store.dispatch('deleteBlogTag', { id })
      if (response.success) this.fetchTaxonomy()
    }
  }
}
</script>
