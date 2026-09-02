function isMobileClientRequest (req) {
  return (
    req.body?.clientType === 'mobile' ||
    String(req.get('x-kadr-client') || '').toLowerCase() === 'mobile'
  )
}

module.exports = {
  isMobileClientRequest
}
