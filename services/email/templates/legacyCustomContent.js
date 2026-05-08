module.exports = ({ content, subject }) => {
  return {
    subject: subject || 'Mail from Kadr.live',
    bodyHtml: content || '<p>No content provided.</p>'
  }
}
