module.exports = {
  welcomeCredentials: ({ email, password, loginUrl, createdBy }) => ({
    subject: 'Welcome aboard!',
    bodyHtml: `
      <p>Thanks for registering on Kadr.live. Your account is now active.</p>
      ${createdBy ? `<p>Your account has been created by ${createdBy}.</p>` : ''}
      <p>To login, use the credentials below:</p>
      <p>Username: ${email}</p>
      <p>Password: ${password}</p>
      <p style="text-align:center;margin:20px 0;">
        <a href="${loginUrl}" style="background-color:#4CAF50;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">
          Login to Your Account
        </a>
      </p>
    `
  }),
  registrationUnderReview: ({ roleLabel }) => ({
    subject: 'Thanks for registering on Kadr.live!',
    bodyHtml: `<p>Thanks for registering on Kadr.live${roleLabel ? ` as a ${roleLabel}` : ''}. Your account is under review, and you'll be notified once approved by the KADR team.</p>`
  }),
  passwordResetOtp: ({ otp }) => ({
    subject: 'Password Reset Request – Kadr.live',
    bodyHtml: `
      <p>We received a request to reset the password for your Kadr.live account.</p>
      <p>Use this OTP to continue:</p>
      <div style="margin:20px 0;padding:12px;background:#f0f4ff;border-left:4px solid #3c78d8;font-size:18px;font-weight:bold;">
        ${otp}
      </div>
    `
  }),
  passwordResetSuccess: () => ({
    subject: 'Password Reset Successful - Kadr.live',
    bodyHtml: `
      <p>Your password has been successfully reset for your Kadr.live account.</p>
      <p>You can now log in using your new password.</p>
    `
  })
}
