function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background-color:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#46a758;padding:20px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.02em;">ALI</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#202020;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 24px;background-color:#46a758;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">${escapeHtml(
    label,
  )}</a>`;
}

export function inviteEmailTemplate(params: {
  name: string;
  acceptUrl: string;
}) {
  const name = escapeHtml(params.name);
  return {
    subject: "You're invited to ALI",
    html: layout(`
      <p>Hi ${name},</p>
      <p>You've been added to ALI, the group's shared shopping/finance tracker. Set a password to activate your account.</p>
      ${button(params.acceptUrl, "Set up your account")}
      <p style="margin-top:24px;color:#646464;font-size:13px;">This link expires in 7 days. If the button doesn't work, copy this URL: ${params.acceptUrl}</p>
    `),
    text: `Hi ${params.name},\n\nYou've been added to ALI. Set up your account: ${params.acceptUrl}\n\nThis link expires in 7 days.`,
  };
}

export function passwordResetEmailTemplate(params: {
  name: string;
  resetUrl: string;
}) {
  const name = escapeHtml(params.name);
  return {
    subject: "Reset your ALI password",
    html: layout(`
      <p>Hi ${name},</p>
      <p>Someone requested a password reset for your ALI account. If this was you, choose a new password below.</p>
      ${button(params.resetUrl, "Reset password")}
      <p style="margin-top:24px;color:#646464;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `),
    text: `Hi ${params.name},\n\nReset your ALI password: ${params.resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  };
}

export function emailChangeConfirmationTemplate(params: {
  name: string;
  confirmUrl: string;
  newEmail: string;
}) {
  const name = escapeHtml(params.name);
  return {
    subject: "Confirm your new ALI email address",
    html: layout(`
      <p>Hi ${name},</p>
      <p>Confirm that ${escapeHtml(
        params.newEmail,
      )} should become the email address for your ALI account.</p>
      ${button(params.confirmUrl, "Confirm email address")}
      <p style="margin-top:24px;color:#646464;font-size:13px;">This link expires in 24 hours. If you didn't request this, you can ignore this email.</p>
    `),
    text: `Hi ${params.name},\n\nConfirm your new ALI email address (${params.newEmail}): ${params.confirmUrl}\n\nThis link expires in 24 hours.`,
  };
}

export function shoppingStartedEmailTemplate(params: {
  organizerName: string;
  eventName: string;
  eventUrl: string;
}) {
  const organizerName = escapeHtml(params.organizerName);
  const eventName = escapeHtml(params.eventName);
  return {
    subject: `${params.organizerName} goes shopping for ${params.eventName} — vote for your ingredients`,
    html: layout(`
      <p>${organizerName} is going shopping for <strong>${eventName}</strong>.</p>
      <p>Vote for the ingredients you want before they head out.</p>
      ${button(params.eventUrl, "Vote now")}
    `),
    text: `${params.organizerName} is going shopping for ${params.eventName}. Vote for your ingredients: ${params.eventUrl}`,
  };
}
