const ROLE_I18N_KEYS = {
  ADMIN: 'common.roleAdmin',
  MEDIATOR: 'common.roleMediator',
  CLIENT: 'common.roleClient',
  REPRESENTATIVE: 'common.roleRepresentative'
}

export function getRoleLabel (userType, translate) {
  const type = String(userType || '').toUpperCase()
  const key = ROLE_I18N_KEYS[type]
  if (!key) return type || ''
  return typeof translate === 'function' ? translate(key) : key
}

export default getRoleLabel
