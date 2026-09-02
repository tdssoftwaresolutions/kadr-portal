const send = async ({ to, subject, html }) => {
  console.warn('Mailchimp provider is not yet implemented. Falling back to noop.', { to, subject })
  return { provider: 'mailchimp', status: 'noop', accepted: Array.isArray(to) ? to : [to], htmlLength: html?.length || 0 }
}

module.exports = {
  send
}
