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
  ACCOUNT_TYPE_REQUIRED: {
    errorCode: 'E111',
    message: 'Multiple accounts found for this email. Please select your account type.'
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
    message: 'An account with this email already exists for this role. Please log in instead.'
  },
  CLIENT_ACCOUNT_EXISTS: {
    errorCode: 'E325',
    message: 'You already have a client account with this email. Please log in and use “Start a new case” from My Cases.'
  },
  MEDIATOR_ACCOUNT_EXISTS: {
    errorCode: 'E326',
    message: 'You already have a mediator account with this email. Please log in instead of registering again.'
  },
  ADMIN_ACCOUNT_EXISTS: {
    errorCode: 'E327',
    message: 'An admin account with this email already exists.'
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
    message: 'User not yet activated, please wait for the Kadr team to review your account.'
  },
  USER_ACCOUNT_DELETED: {
    errorCode: 'E309',
    message: 'This account has been removed from the platform. Contact support if you need assistance.'
  },
  REGISTRATION_PENDING_APPROVAL: {
    errorCode: 'E310',
    message: 'Your registration is pending approval. Please wait for the Kadr team to activate your account.'
  },
  INVALID_OTP: {
    errorCode: 'E305',
    message: 'Invalid OTP, please enter valid OTP.'
  },
  OTP_EXPIRED: {
    errorCode: 'E306',
    message: 'OTP Expired, please request a new one'
  },
  OTP_TOO_MANY_ATTEMPTS: {
    errorCode: 'E328',
    message: 'Too many incorrect attempts. Please request a new OTP.'
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
  },
  CASE_CORRESPONDENCE_BLOCKED: {
    errorCode: 'E310',
    message: 'Your message is empty after removing phone numbers or email addresses. Please revise your text or include an attachment.'
  },
  CASE_CORRESPONDENCE_NO_MEDIATOR: {
    errorCode: 'E311',
    message: 'You can send messages after a mediator is assigned to this case.'
  },
  INVALID_CNR_FORMAT: {
    errorCode: 'E312',
    message: 'Invalid CNR. Enter a 16-character Case Number Record (e.g. DLCT010000012024).'
  },
  COURT_CASE_FETCH_FAILED: {
    errorCode: 'E313',
    message: 'Unable to fetch case details right now. Try again or open the official eCourts portal.'
  },
  COURT_TRACKER_ALREADY_EXISTS: {
    errorCode: 'E314',
    message: 'This CNR is already in your tracker.'
  },
  COURT_TRACKER_LIMIT_REACHED: {
    errorCode: 'E315',
    message: 'You can track up to 25 court cases. Remove one to add another.'
  },
  ECOURTS_CAPTCHA_REQUIRED: {
    errorCode: 'E316',
    message: 'Enter the captcha from eCourts to fetch official case status.'
  },
  ECOURTS_API_NOT_CONFIGURED: {
    errorCode: 'E317',
    message: 'eCourts India API key is not configured. Set ECOURTS_INDIA_API_KEY in the server environment.'
  },
  COURT_CASE_NOT_FOUND: {
    errorCode: 'E318',
    message: 'No case found for this CNR on eCourts India.'
  },
  PREMIUM_REQUIRED: {
    errorCode: 'E320',
    message: 'This feature requires an active Pro subscription.'
  },
  FULFILLMENT_RULE_EMPTY: {
    errorCode: 'E323',
    message: 'Add at least one valid action to the fulfillment flow.'
  },
  FULFILLMENT_RULE_IN_USE: {
    errorCode: 'E324',
    message: 'This rule is attached to reward catalog items. Detach it before deleting.'
  }
}

module.exports = ERROR_CODES
