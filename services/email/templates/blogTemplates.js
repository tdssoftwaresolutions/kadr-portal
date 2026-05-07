module.exports = {
  blogPublished: ({ title, blogUrl }) => ({
    subject: `Your blog '${title}' is now live!`,
    bodyHtml: `
      <p>Your blog <b>${title}</b> is now live!</p>
      <p>To view your blog, click <a href="${blogUrl}">here</a>.</p>
      <p>Thank you for sharing your thoughts with the community!</p>
    `
  })
}
