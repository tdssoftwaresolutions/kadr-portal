<template>
  <div>
    <Alert :message="alert.message" :type="alert.type" v-model="alert.visible" :timeout="alert.timeout"></Alert>
    <Spinner :isVisible="loading" />
    <iq-card v-if="page === 'HOME'">
      <template v-slot:headerTitle>
        <h4 class="card-title">My Blogs</h4>
      </template>
      <template v-slot:headerAction>
          <div class="filters-container">
            <div class="filters-row">
              <b-form-select
                v-model="statusFilter"
                @change="applyFilter"
                :options="filterOptions"
                size="sm"
                class="professional-select"
              >
              </b-form-select>
              <b-form-select
                v-model="categoryFilter"
                @change="applyFilter"
                :options="availableCategories"
                size="sm"
                class="professional-select"
              >
              </b-form-select>
              <b-form-select
                v-model="tagFilter"
                @change="applyFilter"
                :options="availableTags"
                size="sm"
                class="professional-select"
              >
              </b-form-select>
            </div>
            <div class="buttons-row">
               <b-button
                variant="outline-secondary"
                size="sm"
                @click="clearFilters"
                class="clear-filters-btn"
                v-if="statusFilter !== 'All' || categoryFilter !== 'All' || tagFilter !== 'All'"
              >
                <i class="ri-close-line mr-1"></i>
                Clear Filters
              </b-button>
              <b-button
                variant="primary"
                size="sm"
                @click="newBlog"
                class="professional-btn"
              >
                <i class="ri-add-line mr-1"></i>
                New Blog
              </b-button>
            </div>
          </div>
      </template>
      <template v-slot:body>
        <b-col md="12">
          <b-row v-if="filteredBlogs.length > 0">
            <b-col md="4" v-for="blog in filteredBlogs" :key="blog.id || blog.title" class="mb-3">
              <div class="position-relative">
                <b-badge pill :variant="getVariant(blog.status)" class="status-badge" style="z-index:1">{{ blog.status }}</b-badge>
                <b-card class="blog-card h-100">
                  <b-card-body class="d-flex flex-column">
                    <div class="mb-3">
                      <h5 class="card-title text-truncate" @click="onClickBlog(blog)" style="cursor: pointer; color: #007bff;">{{ blog.title }}</h5>
                      <small class="text-muted">{{ formatDateTime(blog.created_at) }}</small>
                    </div>
                    <div class="category-section" v-if="blog.categories && blog.categories.length > 0">
                      <b-badge v-for="category in blog.categories" :key="category.id" pill class="category-badge mr-1">{{ category.name }}</b-badge>
                    </div>
                    <div class="mt-auto d-flex justify-content-between">
                      <b-button variant="outline-primary" size="sm" @click="onClickBlog(blog)">Edit</b-button>
                      <b-button variant="outline-danger" size="sm" @click="deleteBlog(blog)">Delete</b-button>
                    </div>
                  </b-card-body>
                </b-card>
              </div>
            </b-col>
          </b-row>
          <div v-else class="text-center py-5">
            <div class="empty-state">
              <i class="ri-file-list-3-line empty-icon"></i>
              <h5 class="empty-title">No blogs found</h5>
              <p class="empty-subtitle">Create your first blog post to get started</p>
            </div>
          </div>
          <b-pagination
            v-if="paginatedData && paginatedData.total > 0"
            v-model="currentPage"
            :total-rows="paginatedData.total"
            :per-page="perPage"
            align="center"
            class="mt-3"
            @input="fetchBlogs"
          />
        </b-col>
      </template>
    </iq-card>
    <iq-card v-if="page == 'VIEW_EDIT'">
      <template v-slot:headerTitle>
        <h4 class="card-title">{{ selectedBlog.id ? 'Edit Blog' : 'New Blog' }}</h4>
      </template>
      <template v-slot:headerAction>
        <button type="button" class="btn btn-secondary" @click="saveToDraft" v-if="selectedBlog.status != 'Published'">
          Save to Draft
        </button>
        <button type="submit" class="btn btn-primary" @click="publishBlog">Publish</button>
        <button type="button" class="btn btn-danger" @click="deleteBlog(selectedBlog)">Delete</button>
        <button type="button" class="btn btn-outline-secondary" @click="cancel">
          Cancel
        </button>
      </template>
      <template v-slot:body>
        <!-- Title -->
        <div class="mb-3">
          <label for="title" class="form-label fw-semibold">Title</label>
          <input
            id="title"
            v-model="selectedBlog.title"
            type="text"
            class="form-control"
            placeholder="Enter blog title"
            required
          />
        </div>

        <!-- Category -->
        <div class="mb-3">
          <div class="form-group">
            <label for="category" class="form-label fw-semibold">Category</label>
            <div class="d-flex flex-wrap" style="height: 60px;overflow-y: scroll;">
              <div
                v-for="(option, index) in blogAssets.blogCategories"
                :key="index"
                class="option-card"
                :class="{
                  selected: selectedBlog.categories.some(category => category.id === option.id),
                  disabled: selectedBlog.categories.length >= 3 && !selectedBlog.categories.some(category => category.id === option.id)
                }"
                @click="toggleSelection(option)">
                {{ option.name }}
              </div>
            </div>
          </div>
        </div>

        <!-- Tags -->
        <div class="mb-3">
          <label for="tags" class="form-label fw-semibold">Tags</label>
          <div class="tags-container mb-2">
              <b-badge v-for="(tag, index) in selectedBlog.tags" class="badge_tag margin-left" :key="tag.id" pill variant="success">{{ tag.name }}
              <button  type="button" class="btn-close btn-close-white ms-1" aria-label="Remove" @click="removeTag(index)" style="min-width:15px;color:white;background: transparent;border:0px;font-size:21px;">×</button>
            </b-badge>
          </div>

          <!-- Tag Input -->
          <div class="input-group">
            <input
              type="text"
              class="form-control"
              v-model="newTag"
              placeholder="Search or add a new tag"
              @input="searchTags"
              @keyup.enter="addTag"
            />
            <button
              class="btn btn-outline-primary"
              type="button"
              @click="addTag"
            >
              Add
            </button>
          </div>

          <!-- Suggestions Dropdown -->
          <ul
            v-if="tagSuggestions.length"
            class="list-group position-absolute mt-1 shadow-sm"
            style="z-index: 1050; max-height: 150px; overflow-y: auto; width: 66%; box-sizing: border-box"
          >
            <li
              v-for="(suggestion, index) in tagSuggestions"
              :key="index"
              class="list-group-item list-group-item-action"
              @click="selectTag(suggestion)"
            >
              {{ suggestion.name }}
            </li>
          </ul>
        </div>

        <!-- Description (Rich Text Editor) -->
        <div class="mb-3">
          <label for="description" class="form-label fw-semibold">Content</label>
          <vue2-tinymce-editor v-model="selectedBlog.content" :options="options"></vue2-tinymce-editor>
        </div>

        <!-- Buttons -->
        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-secondary" @click="saveToDraft" v-if="selectedBlog.status != 'Published'">
            Save to Draft
          </button>
          <button type="submit" class="btn btn-primary" @click="publishBlog">Publish</button>
          <button type="button" class="btn btn-danger" @click="deleteBlog(selectedBlog)">Delete</button>
          <button type="button" class="btn btn-outline-secondary" @click="cancel">
            Cancel
          </button>
        </div>
      </template>
    </iq-card>
  </div>
</template>
<script>
import { sofbox } from '../../config/pluginInit'
import Alert from '../../components/sofbox/alert/Alert.vue'
import Spinner from '../../components/sofbox/spinner/spinner.vue'
import 'quill/dist/quill.snow.css'
import { Vue2TinymceEditor } from 'vue2-tinymce-editor'

export default {
  name: 'MyBlogs',
  components: {
    Alert, Vue2TinymceEditor, Spinner
  },
  mounted () {
    sofbox.index()
    this.fetchBlogs(1)
  },
  methods: {
    formatDateTime (dateString) {
      console.log(dateString)
      const date = new Date(dateString)
      const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }
      return new Intl.DateTimeFormat('en-US', options).format(date)
    },
    toggleSelection (option) {
      console.log(option)
      if (this.selectedBlog.categories.some(category => category.id === option.id)) {
        this.selectedBlog.categories = this.selectedBlog.categories.filter(item => item.id !== option.id)
      } else if (this.selectedBlog.categories.length < 3) {
        this.selectedBlog.categories.push(option)
      }
    },
    searchTags () {
      if (this.newTag.trim() === '') {
        this.tagSuggestions = []
        return
      }
      this.tagSuggestions = this.blogAssets.blogTags.filter(
        (tag) =>
          tag.name.toLowerCase().includes(this.newTag.toLowerCase()) &&
          !this.selectedBlog.tags.some(lTag => lTag.id === tag.id)
      )
    },
    addTag () {
      const tag = this.newTag.trim()
      if (tag && !this.selectedBlog.tags.some(lTag => lTag.id === tag.id)) {
        this.selectedBlog.tags.push({ id: `NEW-${this.tempTagId}`, name: tag })
        if (!this.blogAssets.blogTags.some(tag => tag.name === tag)) {
          this.blogAssets.blogTags.push({ id: `NEW-${this.tempTagId}`, name: tag }) // store in database!
        }
      }
      this.tempTagId++
      this.newTag = ''
      this.tagSuggestions = []
    },
    selectTag (selectedTag) {
      if (!this.selectedBlog.tags.some(tag => tag.id === selectedTag.id)) {
        this.selectedBlog.tags.push(selectedTag)
      }
      this.newTag = ''
      this.tagSuggestions = []
    },
    removeTag (index) {
      this.selectedBlog.tags.splice(index, 1)
    },
    async saveToDraft () {
      const response = await this.$store.dispatch('saveBlog', {
        blog: this.selectedBlog,
        status: 'Draft'
      })
      if (response.success) {
        const savedBlog = response.data.blog
        await this.updateBlogInList(savedBlog)
        this.selectedBlog = { ...this.selectedBlog, ...savedBlog, status: 'Draft' }
        this.showAlert('Blog saved to draft!', 'success')
        this.cancel()
      }
    },
    cancel () {
      this.page = 'HOME'
    },
    async publishBlog () {
      const response = await this.$store.dispatch('saveBlog', {
        blog: this.selectedBlog,
        status: 'Published'
      })
      if (response.success) {
        const savedBlog = response.data.blog
        await this.updateBlogInList(savedBlog)
        this.selectedBlog = { ...this.selectedBlog, ...savedBlog, status: 'Published' }
        this.showAlert('Blog published succesfully!', 'success')
        this.cancel()
      }
    },
    onClickBlog (blogRecord) {
      this.page = 'VIEW_EDIT'
      this.selectedBlog = blogRecord
    },
    newBlog () {
      this.page = 'VIEW_EDIT'
      this.selectedBlog = {
        categories: [],
        title: '',
        status: '',
        tags: [],
        content: '',
        id: null
      }
    },
    getVariant (status) {
      switch (status) {
        case 'Draft':
          return 'secondary'
        case 'Published':
          return 'success'
      }
    },
    showAlert (message, type) {
      this.alert = {
        message,
        type,
        visible: true
      }
    },
    async fetchBlogs (newPage, forceRefresh = false) {
      this.currentPage = newPage
      if (!forceRefresh && this.blogsCache[this.currentPage]) {
        this.paginatedData = this.blogsCache[this.currentPage]
        return
      }
      const response = await this.$store.dispatch('getMyBlogs', {
        page: this.currentPage
      })
      if (response.success) {
        this.blogsCache[this.currentPage] = response.data
        this.paginatedData = response.data
      }
      await this.fetchBlogAssets()
    },
    async fetchBlogAssets () {
      const response = await this.$store.dispatch('getBlogAssets')
      if (response.success) {
        this.blogAssets = response.data
      }
    },
    async updateBlogInList (blog) {
      const index = this.paginatedData.blogs.findIndex(b => b.id === blog.id)
      if (index !== -1) {
        // Update existing
        this.$set(this.paginatedData.blogs, index, blog)
      } else {
        // New blog
        if (this.currentPage === 1) {
          this.paginatedData.blogs.unshift(blog)
          this.paginatedData.total += 1
        } else {
          // Switch to page 1 to show the new blog
          this.currentPage = 1
          await this.fetchBlogs(1, true)
          return
        }
      }
      // Update cache
      this.blogsCache[this.currentPage] = { ...this.paginatedData }
    },
    removeBlogFromList (blogId) {
      const index = this.paginatedData.blogs.findIndex(b => b.id === blogId)
      if (index !== -1) {
        this.paginatedData.blogs.splice(index, 1)
        this.paginatedData.total -= 1
        // Update cache
        this.blogsCache[this.currentPage] = { ...this.paginatedData }
      }
    },
    applyFilter () {
      // Filter is applied automatically through computed property
    },
    clearFilters () {
      this.statusFilter = 'All'
      this.categoryFilter = 'All'
      this.tagFilter = 'All'
    },
    async deleteBlog (blog) {
      if (confirm('Are you sure you want to delete this blog?')) {
        // Assuming there's a deleteBlog action in the store
        const response = await this.$store.dispatch('deleteBlog', blog.id)
        if (response.success) {
          this.removeBlogFromList(blog.id)
          this.showAlert('Blog deleted successfully!', 'success')
        } else {
          this.showAlert('Failed to delete blog!', 'danger')
        }
      }
    }
  },
  data () {
    return {
      loading: false,
      page: 'HOME',
      tempTagId: 0,
      selectedBlog: {
        categories: [],
        title: '',
        status: '',
        tags: [],
        content: ''
      },
      currentPage: 1,
      newTag: '',
      tagSuggestions: [],
      perPage: 10,
      blogAssets: {},
      paginatedData: { data: { blogs: [], total: 0 } },
      options: {
        height: 800,
        plugins: [
          'autosave lists link image table media fullscreen color preview',
          'paste charmap hr anchor insertdatetime wordcount'
        ],
        toolbar: [
          'undo redo | formatselect | fontselect fontsizeselect | bold italic underline strikethrough |',
          'forecolor backcolor | alignleft aligncenter alignright alignjustify |',
          'bullist numlist outdent indent | table | link image media | fullscreen preview | restoredraft'
        ].join(' '),
        menubar: 'file edit view insert format tools table help',
        branding: false,
        image_title: true,
        automatic_uploads: true,
        autosave_interval: '20s',
        autosave_retention: '30m',
        file_picker_types: 'image',
        file_picker_callback: (callback, value, meta) => {
          const ref = this
          if (meta.filetype === 'image') {
            ref.loading = true
            const input = document.createElement('input')
            input.setAttribute('type', 'file')
            input.setAttribute('accept', 'image/*')
            input.onchange = function () {
              const file = input.files[0]
              const maxFileSizeMB = 1
              const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024
              if (file.size > maxFileSizeBytes) {
                alert(`The file size exceeds the ${maxFileSizeMB} MB limit.`)
                ref.loading = false
                return
              }

              const reader = new FileReader()
              reader.onload = function (e) {
                callback(e.target.result, { alt: file.name })
                console.log('completed')
                ref.loading = false
              }
              reader.onerror = function () {
                alert('Failed to load the file. Please try again.')
                ref.loading = false
              }
              reader.readAsDataURL(file)
            }
            input.click()
          }
        },
        media_live_embeds: true,
        setup: function (editor) {
          editor.addShortcut('ctrl+s', 'Save', function () {
            console.log('Saved!')
          })
        },
        image_caption: true,
        image_dimensions: true,
        media_alt_source: true,
        media_poster: true,
        spellchecker_dialog: true,
        browser_spellcheck: true,
        contextmenu: false,
        content_style: `
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14px;
            line-height: 1.6;
          }
        `,
        wordcount_countregex: /[\w\u2019\x27-]+/g,
        wordcount_cleanregex: /<\/?[a-z][^>]*>/g
      },
      columns: [
        { label: 'Title', key: 'title', class: 'text-left', sortable: true },
        { label: 'Date', key: 'created_at', class: 'text-left', sortable: true },
        { label: 'Categories', key: 'categories', class: 'text-left', sortable: true },
        { label: 'Tags', key: 'tags', class: 'text-left', sortable: true },
        { label: 'Status', key: 'status', class: 'text-left', sortable: true }
      ],
      blogsCache: {},
      alert: {
        visible: false,
        message: '',
        timeout: 5000,
        type: 'primary'
      },
      statusFilter: 'All',
      categoryFilter: 'All',
      tagFilter: 'All',
      filterOptions: [
        { value: 'All', text: 'All Blogs' },
        { value: 'Draft', text: 'Drafts' },
        { value: 'Published', text: 'Published' }
      ]
    }
  },
  computed: {
    availableCategories () {
      if (!this.paginatedData || !this.paginatedData.blogs) return []
      const categories = new Set()
      this.paginatedData.blogs.forEach(blog => {
        blog.categories.forEach(category => {
          categories.add(JSON.stringify({ value: category.id, text: category.name }))
        })
      })
      return [{ value: 'All', text: 'All Categories' }, ...Array.from(categories).map(cat => JSON.parse(cat))]
    },
    availableTags () {
      if (!this.paginatedData || !this.paginatedData.blogs) return []
      const tags = new Set()
      this.paginatedData.blogs.forEach(blog => {
        blog.tags.forEach(tag => {
          tags.add(JSON.stringify({ value: tag.id, text: tag.name }))
        })
      })
      return [{ value: 'All', text: 'All Tags' }, ...Array.from(tags).map(tag => JSON.parse(tag))]
    },
    filteredBlogs () {
      if (!this.paginatedData || !this.paginatedData.blogs) return []

      return this.paginatedData.blogs.filter(blog => {
        // Status filter
        const statusMatch = this.statusFilter === 'All' || blog.status === this.statusFilter

        // Category filter
        const categoryMatch = this.categoryFilter === 'All' ||
          blog.categories.some(category => category.id === this.categoryFilter)

        // Tag filter
        const tagMatch = this.tagFilter === 'All' ||
          blog.tags.some(tag => tag.id === this.tagFilter)

        return statusMatch && categoryMatch && tagMatch
      })
    }
  }
}
</script>
<style scoped>
.ml {
    margin-left: 0.5rem;
}
/* Add space between key and value */
ul li span {
  display: flex;
  align-items: center;
}

ul li span strong {
  margin-right: 8px; /* Add space between key (bold) and value */
}
.ellipsis-text {
  width: 200px;           /* Set a specific width */
  white-space: nowrap;    /* Prevent text from wrapping to the next line */
  overflow: hidden;       /* Hide any overflow text */
  text-overflow: ellipsis; /* Add the ellipsis (...) */
  display: block;         /* Ensure it's treated as a block element */
}
.card {
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  border-bottom: none;
}

.card-body {
  padding: 20px;
  background: #f9f9f9;
}

button {
  min-width: 120px;
}

.rich-text-editor {
  border: 1px solid #ced4da;
  border-radius: 4px;
  min-height: 300px; /* Adjust height */
  max-height: 500px; /* Optional: Limit max height */
  overflow-y: auto; /* Ensure scrollable content */
}
.ql-container.ql-snow {
  min-height: 300px;
  max-height: 600px;
  overflow: scroll;
}
.form-select {
  border: 1px solid #ced4da;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 16px;
  background-color: #ffffff;
  color: #495057;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-select:focus {
  border-color: #80bdff;
  outline: none;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.form-select option {
  font-size: 14px;
  color: #495057;
}

/* Optional: Add hover effect */
.form-select:hover {
  border-color: #86b7fe;
}
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: 600; /* Optional: To make the label stand out */
}
.btn {
  margin-right: 0.5rem;
}
.margin-left {
  margin-left: 0.3rem;
}
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.badge_tag {
  display: flex;
  align-items: center;
  font-size: 14px;
  border-radius: 15px;
}

.input-group {
  display: flex;
}

.input-group input {
  flex: 1;
}

.list-group-item {
  cursor: pointer;
}
.list-group-item:hover {
  background-color: #f1f1f1;
}
ul.list-group {
  max-width: 100%; /* Prevent it from exceeding the container width */
  width: 100%; /* Match the input field's width */
  box-sizing: border-box; /* Include padding and border in the width */
}
.option-card {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #007bff;
      border-radius: 20px;
      padding: 0.5rem 1rem;
      margin: 0.5rem;
      cursor: pointer;
      transition: all 0.3s ease-in-out;
    }

    .option-card.selected {
      background-color: #007bff;
      color: #fff;
      border-color: #0056b3;
    }

    .option-card.disabled {
      opacity: 0.5;
      pointer-events: none;
    }

    .limit-reached {
      color: red;
      font-size: 0.875rem;
      margin-top: 1rem;
    }

.blog-card {
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  transition: all 0.3s ease;
  margin-bottom: 1.5rem;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
}

.blog-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #4a5568;
}

.blog-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #cbd5e0;
}

.blog-card .card-body {
  padding: 1.5rem;
  background: transparent;
}

.blog-card .card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1a202c;
  margin-bottom: 0.5rem;
  line-height: 1.4;
  transition: color 0.2s ease;
}

.blog-card .card-title:hover {
  color: #667eea;
}

.blog-card .text-muted {
  font-size: 0.875rem;
  color: #718096;
  font-weight: 500;
}

.blog-card .badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  letter-spacing: 0.025em;
}

.blog-card .btn {
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  border: none;
  position: relative;
  overflow: hidden;
}

.blog-card .btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.blog-card .btn:hover::before {
  left: 100%;
}

.blog-card .btn-outline-primary {
  background: #3b82f6;
  color: white;
  border: 1px solid #3b82f6;
}

.blog-card .btn-outline-primary:hover {
  background: #2563eb;
  border-color: #2563eb;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.blog-card .btn-outline-danger {
  background: #dc2626;
  color: white;
  border: 1px solid #dc2626;
}

.blog-card .btn-outline-danger:hover {
  background: #b91c1c;
  border-color: #b91c1c;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

.status-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.375rem 0.875rem;
  border-radius: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.category-section {
  margin: 1rem 0;
  padding: 0.75rem;
  background: #f7fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.category-badge {
  background: #4a5568 !important;
  color: white !important;
  border: none !important;
  font-weight: 500 !important;
  margin: 0.125rem !important;
  transition: all 0.2s ease !important;
}

.category-badge:hover {
  background: #2d3748 !important;
  transform: scale(1.05);
}

.professional-select {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  flex: 0 1 auto;
  min-width: 180px;
  width: 180px;
}

.professional-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  outline: none;
}

.professional-select:hover {
  border-color: #9ca3af;
}

.professional-btn {
  background: #3b82f6;
  border: none;
  border-radius: 6px;
  padding: 0.625rem 1.25rem;
  font-weight: 600;
  font-size: 0.875rem;
  color: white;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.professional-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.professional-btn:hover::before {
  left: 100%;
}

.professional-btn:hover {
  background: #2563eb;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.professional-btn i {
  font-size: 1rem;
}

.clear-filters-btn {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: #6b7280;
  background: white;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.clear-filters-btn:hover {
  border-color: #dc2626;
  color: #dc2626;
  background: #fef2f2;
}

.clear-filters-btn i {
  font-size: 1rem;
}

.filters-container {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}

.filters-row {
  display: flex;
  gap: 1rem;
  flex-wrap: nowrap;
  flex: 1;
  justify-content: center;
  align-items: center;
}

.professional-select {
  flex: 0 1 auto;
  min-width: 180px;
  width: 180px;
}

.buttons-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: nowrap;
  align-items: center;
  margin-left: auto;
}

.empty-state {
  padding: 3rem 2rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  margin: 2rem 0;
}

.empty-icon {
  font-size: 4rem;
  color: #9ca3af;
  margin-bottom: 1rem;
  display: block;
}

.empty-title {
  color: #374151;
  font-weight: 600;
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.empty-subtitle {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .blog-card .card-body {
    padding: 1rem;
  }

  .blog-card .card-title {
    font-size: 1rem;
  }

  .status-badge {
    top: 0.75rem;
    right: 0.75rem;
    font-size: 0.7rem;
    padding: 0.25rem 0.625rem;
  }

  .professional-btn {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }

  .professional-select {
    min-width: 0;
    width: 120px;
    font-size: 0.8rem;
  }

  .filters-container {
    flex-direction: column;
    gap: 0.75rem;
  }

  .filters-row {
    justify-content: flex-start;
    gap: 0.5rem;
  }

  .buttons-row {
    margin-left: 0;
    width: 100%;
  }

  .category-section {
    padding: 0.5rem;
  }
}

@media (max-width: 576px) {
  .blog-card {
    margin-bottom: 1rem;
  }

  .blog-card .btn {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }

  .filters-container {
    flex-direction: column;
    gap: 0.5rem;
  }

  .filters-row {
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .professional-select {
    width: 100px;
    font-size: 0.75rem;
    padding: 0.375rem 0.5rem;
  }

  .buttons-row {
    width: 100%;
    gap: 0.5rem;
  }

  .professional-btn,
  .clear-filters-btn {
    flex: 1;
    min-width: 0;
  }

  .professional-btn span,
  .clear-filters-btn span {
    display: none;
  }

  .professional-btn i,
  .clear-filters-btn i {
    margin-right: 0;
  }
}

/* Card Animation */
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.blog-card {
  animation: cardFadeIn 0.6s ease-out;
  animation-fill-mode: both;
}

.blog-card:nth-child(1) { animation-delay: 0.1s; }
.blog-card:nth-child(2) { animation-delay: 0.2s; }
.blog-card:nth-child(3) { animation-delay: 0.3s; }
.blog-card:nth-child(4) { animation-delay: 0.4s; }
.blog-card:nth-child(5) { animation-delay: 0.5s; }
.blog-card:nth-child(6) { animation-delay: 0.6s; }
</style>
