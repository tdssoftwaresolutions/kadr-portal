// Auth
export const LOGIN_ENDPOINT = '/login';
export const LOGOUT_ENDPOINT = '/logout';
export const REFRESH_TOKEN_ENDPOINT = '/refresh-token';
export const RESET_PASSWORD_ENDPOINT = '/resetPassword';
export const CONFIRM_PASSWORD_CHANGE_ENDPOINT = '/confirmPasswordChange';
export const NEW_USER_SIGNUP_ENDPOINT = '/newUserSignup';
export const NEW_MEDIATOR_SIGNUP_ENDPOINT = '/newMediatorSignup';
export const IS_EMAIL_EXIST_ENDPOINT = '/isEmailExist';
export const SEND_OTP_ENDPOINT = '/sendOtp';
export const VERIFY_OTP_ENDPOINT = '/verifyOTP';
export const GET_EXISTING_USER_ENDPOINT = '/getExistingUser';

// User
export const GET_USER_DATA_ENDPOINT = '/getUserData';
export const UPDATE_USER_PROFILE_ENDPOINT = '/updateUserProfile';
export const DELETE_MY_ACCOUNT_ENDPOINT = '/deleteMyAccount';
export const GET_DASHBOARD_CONTENT_ENDPOINT = '/getDashboardContent';
export const VERIFY_SIGNATURE_ENDPOINT = '/verify-signature';

// Cases
export const MARK_CASE_RESOLVED_ENDPOINT = '/markCaseResolved';
export const ACCEPT_MEDIATION_REQUEST_ENDPOINT = '/acceptMediationRequest';
export const INITIATE_NEW_CASE_ENDPOINT = '/initiateNewCase';
export const SET_CLIENT_PAYMENT_ENDPOINT = '/setClientPayment';
export const GET_PAST_MEDIATIONS_ENDPOINT = '/getPastMediations';
export const SUBMIT_EVENT_FEEDBACK_ENDPOINT = '/submitEventFeedback';
export const APPROVE_CASE_TYPE_ENDPOINT = '/cases/approve-type';

// Calendar
export const GET_CALENDAR_INIT_ENDPOINT = '/getCalendarInit';
export const NEW_CALENDAR_EVENT_ENDPOINT = '/newCalendarEvent';

// Case Correspondence
export const GET_CASE_CORRESPONDENCE_ENDPOINT = '/case-correspondence';
export const POST_CASE_CORRESPONDENCE_ENDPOINT = '/case-correspondence';

// Payments
export const PAYMENT_CONFIG_ENDPOINT = '/payment/config';
export const PAYMENT_AMOUNTS_ENDPOINT = '/payment/amounts';
export const PAYMENT_INITIATE_ENDPOINT = '/payment/initiate';
export const PAYMENT_VERIFY_ENDPOINT = '/payment/verify';

// Mediator
export const GET_MY_REWARDS_ENDPOINT = '/mediator/rewards';
export const REDEEM_REWARD_ENDPOINT = '/mediator/redeem-reward';
export const MEDIATOR_SUBSCRIPTION_ENDPOINT = '/mediator/subscription';
export const MEDIATOR_SUBSCRIPTION_PURCHASE_ENDPOINT =
  '/mediator/subscription/purchase';
export const MEDIATOR_LEGAL_FEEDS_ENDPOINT = '/mediator/legal-feeds';
export const MEDIATOR_COURT_CASES_ENDPOINT = '/mediator/court-cases';
export const MEDIATOR_PRIVATE_INVOICE_SETTINGS =
  '/mediator/private-invoice-settings';
export const MEDIATOR_PRIVATE_INVOICE_UPLOAD =
  '/mediator/private-invoice-settings/upload';
export const MEDIATOR_PRIVATE_INVOICES = '/mediator/private-invoices';
export const MEDIATOR_INCOME_ENDPOINT = '/mediator/income';
export const GET_MEDIATOR_BANK_ACCOUNT_ENDPOINT = '/mediator-bank-account';
export const POST_MEDIATOR_BANK_ACCOUNT_ENDPOINT = '/mediator-bank-account';

// Blog & Content
export const GET_MY_BLOGS_ENDPOINT = '/getMyBlogs';
export const SAVE_BLOG_ENDPOINT = '/saveBlog';
export const DELETE_BLOG_ENDPOINT = '/deleteBlog';
export const GET_MY_VIDEO_REELS_ENDPOINT = '/getMyVideoReels';
export const SAVE_VIDEO_REEL_ENDPOINT = '/saveVideoReel';
export const DELETE_VIDEO_REEL_ENDPOINT = '/deleteVideoReel';

// Finance
export const GET_INVOICES_ENDPOINT = '/invoices';
export const GET_TRANSACTIONS_ENDPOINT = '/transactions';

// Notes
export const SAVE_NOTE_ENDPOINT = '/saveNote';
export const DELETE_NOTE_ENDPOINT = '/deleteNote';

// Admin
export const GET_INACTIVE_USERS_ENDPOINT = '/getInactiveUsers';
export const GET_ACTIVE_USERS_ENDPOINT = '/getActiveUsers';
export const UPDATE_INACTIVE_USER_ENDPOINT = '/updateInactiveUser';
export const ADMIN_USERS_ENDPOINT = '/users';
export const ADMIN_USERS_ACTIVE_ENDPOINT = '/users/active';
export const GET_ADMIN_ACTIVE_CASES_ENDPOINT = '/activeCases';
export const GET_ADMIN_CASE_META_ENDPOINT = '/caseManagementMeta';
export const POST_ADMIN_ASSIGN_CASE_MEDIATOR_ENDPOINT = '/assignCaseMediator';
export const GET_SETTINGS_ENDPOINT = '/settings';
export const POST_SETTINGS_ENDPOINT = '/settings';
export const POST_CASE_COMMISSION_ENDPOINT = '/cases/commission';
export const POST_SYNC_INVOICES_ENDPOINT = '/invoices/sync';
export const POST_MARK_INVOICE_PAID_ENDPOINT = '/invoices/mark-paid';
export const ADMIN_SET_USER_DELETED_ENDPOINT = '/admin/setUserDeleted';
export const ADMIN_BLOG_TAXONOMY_ENDPOINT = '/blog-taxonomy';
export const ADMIN_BLOG_CATEGORIES_ENDPOINT = '/blog-categories';
export const ADMIN_BLOG_TAGS_ENDPOINT = '/blog-tags';
export const ADMIN_CORRESPONDENCE_INBOX_ENDPOINT =
  '/admin/correspondence/inbox';
export const ADMIN_CORRESPONDENCE_MARK_READ_ENDPOINT =
  '/admin/correspondence/inbox/mark-read';
export const ADMIN_NOTIFICATION_TEMPLATES = '/admin/notifications/templates';
export const ADMIN_NOTIFICATION_SEND = '/admin/notifications/send';
export const ADMIN_NOTIFICATION_SEND_LOGS = '/admin/notifications/send-logs';
export const ADMIN_REWARD_CATALOG_ENDPOINT = '/admin/reward-catalog';
export const ADMIN_REWARD_ORDERS_ENDPOINT = '/admin/reward-orders';
export const ADMIN_WEBSITE_CONTENT_ENDPOINT = '/admin/website-content';

// Support
export const GET_PORTAL_SUPPORT_THREADS_ENDPOINT = '/portal/support/threads';

// Push
export const PUSH_REGISTER_ENDPOINT = '/push/register';
export const PUSH_UNREGISTER_ENDPOINT = '/push/unregister';

// Available languages
export const AVAILABLE_LANGUAGES_ENDPOINT = '/getAvailableLanguages';
