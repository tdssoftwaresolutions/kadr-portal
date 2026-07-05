const path = require('path')
const prisma = require('../lib/prisma.js')

/**
 * Middleware to handle blog URL redirects
 * If a blog page is not found (404), check redirect_blogs table
 * If old URL exists, redirect to new URL
 */
async function blogRedirectMiddleware (req, res, next) {
  // Only handle GET requests and blog paths
  if (req.method !== 'GET' || !req.path.startsWith('/blog/')) {
    return next()
  }

  try {
    // Determine requested blog URL path relative to public/website
    let requestedUrl = req.path.startsWith('/') ? req.path.slice(1) : req.path
    // Normalize incoming blog requests so old .html URLs still resolve
    requestedUrl = requestedUrl.replace(/\.html$/, '')

    // Search in redirect_blogs table
    const redirect = await prisma.redirect_blogs.findUnique({
      where: { old_url: requestedUrl }
    })

    if (redirect) {
      // Redirect to the stored new URL, keeping the .html path intact
      const newPath = '/' + redirect.new_url
      return res.redirect(301, newPath)
    }

    // No redirect found: show the custom 404 page for deleted/missing blog URLs
    return res.status(404).sendFile(path.join(__dirname, '..', 'public', 'website', '404.html'))
  } catch (error) {
    console.error('Error in blogRedirectMiddleware:', error)
    next()
  }
}

module.exports = blogRedirectMiddleware
