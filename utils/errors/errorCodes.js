const ERROR_CODES = {
  // General Errors
  INTERNAL_SERVER_ERROR: {
    errorCode: 'E001',
    message: 'Internal server error occurred. Please try again later.'
  },
  INVALID_REQUEST: {
    errorCode: 'E002',
    message: 'The request is invalid. Please check your input.'
  },
  UNAUTHORIZED: {
    errorCode: 'E003',
    message: 'You are not authorized to access this resource.'
  },
  FORBIDDEN: {
    errorCode: 'E004',
    message: 'You do not have permission to perform this action.'
  },
  NOT_FOUND: {
    errorCode: 'E005',
    message: 'The requested resource could not be found.'
  },
  GOOGLE_ACCOUNT_NOT_CONFIGURED: {
    errorCode: 'E006',
    message: 'This feature requires you to login with your Gmail account for managing events & scheduling meeting. Please login below'
  },
  GOOGLE_CALENDAR_NOT_CONNECTED: {
    errorCode: 'E007',
    message: 'Google Calendar not connected.'
  },

  GOOGLE_AUTH_FAILED: {
    errorCode: 'E0010',
    message: 'Google authentication failed.'
  },
  NO_RECORD_FOUND: {
    errorCode: 'E008',
    message: 'Record not found.'
  },

  // Authentication Errors
  INVALID_CREDENTIALS: {
    errorCode: 'E101',
    message: 'Invalid username or password.'
  },
  NO_TOKEN_PROVIDED: {
    error: 'E105',
    message: 'No token provided, authorization denied'
  },
  TOKEN_EXPIRED: {
    errorCode: 'E102',
    message: 'Your session has expired, reauthenticate.'
  },
  REFRESH_TOKEN_EXPIRED: {
    errorCode: 'E103',
    message: 'Your session has expired. Please log in again.'
  },
  NO_REFRESH_TOKEN: {
    errorCode: 'E104',
    message: 'No refresh token'
  },
  AUTHENTICATION_FAILED: {
    error: 'E105',
    messsage: 'Authentication failed'
  },

  // Validation Errors
  MISSING_FIELD: {
    errorCode: 'E201',
    message: 'Required field is missing.'
  },
  INVALID_EMAIL_FORMAT: {
    errorCode: 'E202',
    message: 'Invalid email format.'
  },
  MISSING_REQUIRED_DETAIL: {
    errorCode: 'E203',
    message: 'Missing required fields'
  },

  // Custom Errors
  USER_ALREADY_EXISTS: {
    errorCode: 'E301',
    message: 'A user with this email already exists.'
  },
  YOU_USER_ALREADY_EXISTS: {
    errorCode: 'E307',
    message: 'A user with your email already exists, login instead.'
  },
  RESOURCE_CONFLICT: {
    errorCode: 'E302',
    message: 'The resource you are trying to modify is in conflict with existing data.'
  },
  USER_NOT_FOUND: {
    errorCode: 'E303',
    message: 'A user not found for this session.'
  },
  USER_NOT_ACTIVE: {
    errorCode: 'E304',
    message: 'User not yet activated, please wait for Rouse Avenue team to review your account.'
  },
  INVALID_OTP: {
    errorCode: 'E305',
    message: 'Invalid OTP, please enter valid OTP.'
  },
  OTP_EXPIRED: {
    errorCode: 'E306',
    message: 'OTP Expired, please request a new one'
  },
  REQUIRED_CASE_ID: {
    errorCode: 'E307',
    message: 'Case ID is required'
  },
  CASE_NOT_FOUND: {
    errorCode: 'E307',
    message: 'Case not found'
  },
  NO_ACTIVE_MEDIATOR: {
    errorCode: 'E308',
    message: 'No active mediators found'
  },
  ADMIN_NOTIFIED_FOR_MEDIATOR: {
    errorCode: 'E309',
    message: 'No mediator available, admin notified'
  }
}

module.exports = ERROR_CODES
