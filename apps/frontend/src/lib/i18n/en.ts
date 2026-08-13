/**
 * English dictionary — the source of truth for every translation key.
 *
 * Deliberately NOT declared `as const`: leaf values must widen to `string` so
 * that `fr.ts` can be typed as `typeof en` and still hold French copy. Adding a
 * key here makes it a compile error in every other locale until it is supplied.
 *
 * Conventions:
 *  - Group keys by surface (`nav`, `auth.login`, `dashboard`, ...).
 *  - Enum-style namespaces (`status`, `lineOfBusiness`, `role`, ...) are keyed by
 *    the exact code the API returns so `tEnum()` can look them up directly.
 *  - Placeholders use `{name}` and are interpolated by `t()`.
 */
export const en = {
  common: {
    appName: 'NexusRe',
    tagline: 'Digital Reinsurance Placement Platform',
    loading: 'Loading...',
    language: 'Language',
    actions: {
      save: 'Save',
      cancel: 'Cancel',
      submit: 'Submit',
      upload: 'Upload',
      download: 'Download',
      search: 'Search',
      filter: 'Filter',
      clearFilters: 'Clear filters',
      create: 'Create',
      edit: 'Edit',
      update: 'Update',
      delete: 'Delete',
      view: 'View',
      viewAll: 'View all',
      close: 'Close',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      retry: 'Retry',
      refresh: 'Refresh',
      send: 'Send',
      add: 'Add',
      remove: 'Remove',
      select: 'Select',
      accept: 'Accept',
      decline: 'Decline',
      export: 'Export',
    },
    labels: {
      status: 'Status',
      type: 'Type',
      lineOfBusiness: 'Line of business',
      organization: 'Organization',
      emailAddress: 'Email address',
      password: 'Password',
      firstName: 'First name',
      lastName: 'Last name',
      role: 'Role',
      roles: 'Role(s)',
      currency: 'Currency',
      date: 'Date',
      allStatuses: 'All statuses',
      allTypes: 'All types',
      allLines: 'All lines',
    },
    states: {
      empty: 'Nothing to show yet.',
      error: 'Something went wrong. Please try again.',
      networkError: 'Unable to reach the server. Check your connection and try again.',
      required: 'This field is required.',
    },
  },

  nav: {
    dashboard: 'Dashboard',
    submissions: 'Submissions',
    opportunities: 'Opportunities',
    appetite: 'Appetite',
    organizations: 'Organizations',
    users: 'Users',
    audit: 'Audit',
    forms: 'Forms',
    profile: 'Profile',
    logout: 'Logout',
    loggingOut: 'Signing out...',
    openMenu: 'Open main menu',
  },

  notifications: {
    title: 'Notifications',
    markAllRead: 'Mark all read',
    empty: 'Nothing yet.',
    ariaLabel: 'Notifications',
    ariaLabelWithUnread: 'Notifications, {count} unread',
  },

  auth: {
    login: {
      title: 'Sign in to your account',
      emailPlaceholder: 'Email address',
      passwordPlaceholder: 'Password',
      forgotPassword: 'Forgot your password?',
      submit: 'Sign in',
      submitting: 'Signing in...',
      noAccount: "Don't have an account?",
      registerLink: 'Register here',
      failed: 'Login failed. Please check your credentials.',
      testCredentials: 'Test credentials:',
    },
    register: {
      title: 'Create your account',
      passwordHint: 'Min. 8 characters',
      confirmPassword: 'Confirm password',
      selectOrganization: 'Select an organization',
      submit: 'Create account',
      submitting: 'Creating account...',
      haveAccount: 'Already have an account?',
      signInLink: 'Sign in',
      passwordMismatch: 'Passwords do not match',
      organizationRequired: 'Please select an organization',
      roleRequired: 'Please select at least one role',
      failed: 'Registration failed. Please try again.',
    },
    forgotPassword: {
      title: 'Reset your password',
      description: "Enter your email address and we'll send you a link to reset your password.",
      emailPlaceholder: 'Email address',
      submit: 'Send reset link',
      submitting: 'Sending...',
      backToLogin: 'Back to login',
      sentTitle: 'Check your email',
      sentDescription:
        'If an account exists with {email}, you will receive a password reset link shortly.',
      returnToLogin: 'Return to login',
    },
  },

  dashboard: {
    greeting: 'Welcome, {name}!',
    subtitle: '{role} dashboard',
    stats: {
      totalSubmissions: 'Total submissions',
      pendingReview: 'Pending review',
      completed: 'Completed',
      activeQuotes: 'Active quotes',
      boundPremium: 'Bound premium',
    },
    links: {
      viewAllSubmissions: 'View all submissions',
      viewPending: 'View pending',
      viewCompleted: 'View completed',
      viewOpportunities: 'View opportunities',
    },
    quickActions: {
      title: 'Quick actions',
      createSubmission: 'Create new submission',
      viewAllSubmissions: 'View all submissions',
      browseOpportunities: 'Browse opportunities',
      manageAppetite: 'Manage appetite',
    },
    recent: {
      title: 'Recent submissions',
      empty: 'No submissions yet.',
      viewAll: 'View all',
    },
    admin: {
      title: 'Administrator access',
      description:
        'You have administrator privileges. You can manage organizations, users, and system settings.',
    },
  },

  /** Submission statuses, keyed by the code the API returns. */
  status: {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under review',
    quoted: 'Quoted',
    negotiating: 'Negotiating',
    bound: 'Bound',
    declined: 'Declined',
    expired: 'Expired',
  },

  /** Quote statuses, keyed by the code the API returns. */
  quoteStatus: {
    indication: 'Indication',
    firm_offer: 'Firm offer',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired',
  },

  quoteType: {
    indication: 'Indication',
    firm_order: 'Firm order',
    binding: 'Binding',
  },

  submissionType: {
    treaty: 'Treaty',
    facultative: 'Facultative',
  },

  /** Lines of business, keyed by the code the API returns. */
  lineOfBusiness: {
    property: 'Property',
    casualty: 'Casualty',
    energy: 'Energy',
    marine: 'Marine',
    aviation: 'Aviation',
    cyber: 'Cyber',
    political_violence: 'Political violence',
    agriculture: 'Agriculture',
    engineering: 'Engineering',
    professional_indemnity: 'Professional indemnity',
    motor: 'Motor',
    liability: 'Liability',
  },

  organizationType: {
    cedant: 'Cedant',
    broker: 'Broker',
    reinsurer: 'Reinsurer',
    admin: 'Admin',
  },

  /** Role codes as issued by the backend seed. */
  role: {
    super_admin: 'Super administrator',
    org_admin: 'Organization administrator',
    cedant_user: 'Cedant user',
    broker_user: 'Broker user',
    reinsurer_underwriter: 'Reinsurance underwriter',
    reinsurer_admin: 'Reinsurer administrator',
  },
};
