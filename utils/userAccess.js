/** Shared filters and checks for platform access (active approval vs soft-delete). */

function activeUserFilter () {
  return { is_deleted: false }
}

function eligibleMediatorFilter () {
  return {
    user_type: 'MEDIATOR',
    active: true,
    is_deleted: false
  }
}

function eligibleClientFilter () {
  return {
    user_type: 'CLIENT',
    active: true,
    is_deleted: false
  }
}

function canUsePlatform (user) {
  if (!user) return false
  if (user.is_deleted === true) return false
  if (user.active === false) return false
  return true
}

function canLogin (user) {
  if (!user) return false
  if (user.is_deleted === true) return false
  if (user.active === false) return false
  return true
}

module.exports = {
  activeUserFilter,
  eligibleMediatorFilter,
  eligibleClientFilter,
  canUsePlatform,
  canLogin
}
