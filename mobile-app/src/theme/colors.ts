/**
 * Kadr brand color palette
 */
export const colors = {
  primary: '#4361EE',
  primaryDark: '#3A56D4',
  primaryLight: '#6B84F2',
  secondary: '#7209B7',
  secondaryLight: '#9B59B6',
  accent: '#F72585',

  success: '#2ECC71',
  successLight: '#D4EFDF',
  warning: '#F39C12',
  warningLight: '#FEF5E7',
  danger: '#E74C3C',
  dangerLight: '#FDEDEC',
  info: '#3498DB',
  infoLight: '#EBF5FB',

  background: '#F8F9FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E8ECF0',
  divider: '#F0F2F5',

  text: '#1A1D26',
  textSecondary: '#6C757D',
  textMuted: '#ADB5BD',
  textInverse: '#FFFFFF',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Role-based colors
  admin: '#E74C3C',
  mediator: '#4361EE',
  client: '#2ECC71',

  // Status colors
  statusActive: '#2ECC71',
  statusPending: '#F39C12',
  statusResolved: '#3498DB',
  statusClosed: '#6C757D',
};

export type ColorKey = keyof typeof colors;
