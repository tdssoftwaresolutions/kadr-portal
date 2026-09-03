/**
 * Password policy aligned across recover-password and profile change.
 */
export function validatePasswordStrength (password) {
  if (!password || password.length < 8) {
    return { error: true, message: 'Password must be at least 8 characters.' }
  }
  if (!/[A-Z]/.test(password)) {
    return { error: true, message: 'Password must include an uppercase letter.' }
  }
  if (!/[a-z]/.test(password)) {
    return { error: true, message: 'Password must include a lowercase letter.' }
  }
  if (!/[0-9]/.test(password)) {
    return { error: true, message: 'Password must include a number.' }
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { error: true, message: 'Password must include a special character.' }
  }
  return { error: false }
}
