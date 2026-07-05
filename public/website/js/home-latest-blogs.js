(function () {
  var CARD_IMAGES = ['ci-trader', 'ci-family', 'ci-property']

  function esc (s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function formatDate (value) {
    if (!value) return ''
    try {
      return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch (e) {
      return ''
    }
  }

  function renderBlogCard (blog, index) {
    var imgClass = CARD_IMAGES[index % CARD_IMAGES.length]
    var cat = blog.categories && blog.categories.length ? blog.categories[0].name : 'Blog'
    var url = blog.url ? '/' + blog.url.replace(/^\//, '') : '/blog'
    var excerpt = esc((blog.content || '').replace(/\s+/g, ' ').trim())
    if (excerpt.length > 140) excerpt = excerpt.slice(0, 140) + '…'
    var dateStr = formatDate(blog.created_at)
    return (
      '<div class="case-card kadr-blog-card" role="link" tabindex="0" data-url="' + esc(url) + '" style="cursor:pointer">' +
      '<div class="case-img ' + imgClass + '"><div class="case-badge">' + esc(cat) + '</div></div>' +
      '<div class="case-body">' +
      '<div class="case-cat">' + esc(cat) + '</div>' +
      '<div class="case-title copy-en">' + esc(blog.title) + '</div>' +
      '<div class="case-title copy-hi">' + esc(blog.title) + '</div>' +
      '<div class="case-excerpt copy-en">' + excerpt + '</div>' +
      '<div class="case-excerpt copy-hi">' + excerpt + '</div>' +
      '<div class="case-footer">' +
      '<div class="case-outcome">📰 <span class="copy-en">Blog</span><span class="copy-hi">Blog</span></div>' +
      (dateStr ? '<div class="case-days">' + esc(dateStr) + '</div>' : '') +
      '<span class="case-cta copy-en">Read story →</span>' +
      '<span class="case-cta copy-hi">Kahani padho →</span>' +
      '</div></div></div>'
    )
  }

  function wireCards (root) {
    root.querySelectorAll('.kadr-blog-card').forEach(function (el) {
      function go () {
        var url = el.getAttribute('data-url')
        if (url) window.location.href = url
      }
      el.addEventListener('click', go)
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          go()
        }
      })
    })
  }

  async function loadLatestBlogs () {
    var grid = document.getElementById('kadr-latest-blogs')
    if (!grid) return
    try {
      var res = await fetch('/api/getBlogs?page=1')
      var json = await res.json()
      var blogs = (json.data && json.data.blogs) || []
      blogs = blogs.slice(0, 3)
      if (!blogs.length) {
        grid.innerHTML = '<p class="copy-en" style="text-align:center;color:var(--text-muted);padding:24px">No blog stories yet.</p>' +
          '<p class="copy-hi" style="text-align:center;color:var(--text-muted);padding:24px">Abhi koi blog story nahi hai.</p>'
        return
      }
      grid.innerHTML = blogs.map(renderBlogCard).join('')
      wireCards(grid)
    } catch (e) {
      console.error('[home] Latest blogs:', e)
      grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:24px">Could not load stories.</p>'
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLatestBlogs)
  } else {
    loadLatestBlogs()
  }
})()
