<template>
  <a :href="url" target="_blank" rel="noopener noreferrer" class="file-link">
    <div class="file-card">

      <!-- Preview Area -->
      <div class="preview">
        <!-- Image -->
        <img v-if="type === 'image'" :src="url" />

        <!-- PDF -->
        <iframe
          v-else-if="type === 'pdf'"
          :src="url + '#toolbar=0'"
        ></iframe>

        <!-- Office Docs -->
        <iframe
          v-else-if="type === 'office'"
          :src="officeViewerUrl"
        ></iframe>

        <!-- Fallback -->
        <div v-else class="file-icon">
          📄
        </div>

      </div>

      <!-- File Info -->
      <div class="file-info">
        {{ name }}
      </div>

    </div>
  </a>
</template>

<script>
export default {
  name: 'FilePreview',

  props: {
    url: {
      type: String,
      required: true
    },
    name: {
      type: String,
      default: 'Document'
    }
  },

  computed: {
    type () {
      const ext = this.url.split('.').pop()?.toLowerCase()

      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
      if (ext === 'pdf') return 'pdf'
      if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'office'

      return 'other'
    },

    officeViewerUrl () {
      return `https://docs.google.com/gview?url=${encodeURIComponent(this.url)}&embedded=true`
    }
  }
}
</script>

<style scoped>
.file-link {
  width: fit-content;
  margin:5px;
  text-decoration: none;
  color: inherit;
}

.file-card {
  width: 280px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  transition: 0.2s;
  cursor: pointer;
}

.file-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.preview {
  height: 180px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview img,
.preview iframe {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: none;
}

.file-icon {
  font-size: 40px;
}

.file-info {
  padding: 10px;
  font-size: 14px;
  font-weight: 500;
}

.preview {
  height: 180px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;

  overflow: hidden;          /* ✅ hides scroll */
  position: relative;
}

/* Make iframe larger than container */
.preview iframe {
  width: 100%;
  height: 350px;             /* ✅ bigger than preview */
  border: none;

  pointer-events: none;      /* ✅ disables scroll & interaction */
}

/* Keep images normal */
.preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview::after {
  content: "Click to view";
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
}
</style>
