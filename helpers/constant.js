module.exports = Object.freeze({
  staticKeywords: {
    email: 'email',
    user: 'user',
    subAdmin: 'subAdmin',
    category: 'category',
    staticContent: 'staticContent',
    faq: 'faq',
    subscription: 'subscription'
  },
  orderType: {
    limit: 'Limit',
    market: 'Market'
  },
  status: {
    active: 'active',
    inactive: 'inactive',
    pending: 'pending',
    rejected: 'rejected',
    sent: 'sent',
    approved: 'approved',
    accepted: 'accepted',
    completed: 'completed',
    deleted: 'deleted',
    cancelled: 'cancelled'
  },
  emailSlug: {
    welcomeEmail: 'welcome_email',
    resetPasscode: 'reset_passcode_successfully'
  },
  type: {
    user: 'user',
    owner: 'owner',
    manager: 'manager',
    admin: 'admin',
    subAdmin: 'subAdmin',
    category: 'category',
    subcategory: 'subcategory',
    staticContent: 'staticContent',
    faq: 'faq',
    country: 'country'
  },

  staticMobileNumbers: ['1122334455', '1234567891'],

  maxFileSizeLimit: 20 * 1024 * 1024, // max file size 5 MB

  staticResponseForEmptyResult: {
    docs: [],
    totalDocs: 0,
    limit: 0,
    page: 1,
    totalPages: 1
  },
  mimeTypes: {
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'application/pdf': 'pdf',
    'application/json': 'json',
    'application/javascript': 'js',
    'text/plain': 'txt',
    'text/html': 'html',
    'text/css': 'css',
    'video/x-msvideo': 'msvideo',
    'video/mpeg': 'mpeg',
    'video/mp4': 'mp4',
    'video/mp3': 'mp43',
    'video/ogg': 'ogg',
    'video/webm': 'webm',
    'text/csv': 'csv',
  },
  returnEmailContent: function (otpEmail) {
    return `Its seems you are registering at Quotes for it and trying to verify your email. <br>
        Here is the verification code. Please copy it and verify your Email.
        <div style="width: 30%; background-color: lightblue; padding: 10px; border-radius: 5px; margin: 5px">${otpEmail}</div>
        If this email is not intented to you please ignore and delete it.<br> Thank you for understanding.`
  },
  emailSubjects: {
    emailVerificationOTP: 'Email Verification OTP'
  }
})
