import { SendEmailCommand } from '@aws-sdk/client-ses';

import { ses } from '../config/ses';
import { env } from '../config/env';

class EmailService {
  private async send(to: string, subject: string, htmlBody: string) {
    if (!ses) {
      console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
      console.log(`[EMAIL STUB] Body preview: ${htmlBody.replace(/<[^>]*>/g, '').slice(0, 200)}`);
      return;
    }

    await ses.send(
      new SendEmailCommand({
        Source: env.AWS_SES_FROM_EMAIL,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: { Html: { Data: htmlBody } },
        },
      }),
    );
  }

  private wrap(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
      <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
          <div style="padding:24px 32px;background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;">
            <h1 style="margin:0;font-size:22px;font-weight:600;">Tipper</h1>
          </div>
          <div style="padding:32px;">
            ${content}
          </div>
          <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280;">
            &copy; ${new Date().getFullYear()} Tipper. Digital Tipping Platform.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendPasswordResetEmail(to: string, name: string, resetToken: string) {
    const resetUrl = `${env.CORS_ORIGIN}/reset-password?token=${resetToken}`;
    const html = this.wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Reset Your Password</h2>
      <p style="color:#374151;line-height:1.6;">Hi ${name},</p>
      <p style="color:#374151;line-height:1.6;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Reset Password</a>
      </div>
      <p style="color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
    `);
    await this.send(to, 'Reset Your Password - Tipper', html);
  }

  async sendAdminPasswordResetEmail(to: string, name: string, tempPassword: string) {
    const html = this.wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Your Password Has Been Reset</h2>
      <p style="color:#374151;line-height:1.6;">Hi ${name},</p>
      <p style="color:#374151;line-height:1.6;">An administrator has reset your password. Use the temporary password below to log in, then change it immediately.</p>
      <div style="margin:20px 0;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center;">
        <code style="font-size:18px;font-weight:600;color:#111827;letter-spacing:1px;">${tempPassword}</code>
      </div>
      <p style="color:#6b7280;font-size:13px;">Please change this password after logging in.</p>
    `);
    await this.send(to, 'Your Password Has Been Reset - Tipper', html);
  }

  async sendTipNotificationEmail(
    to: string,
    staffName: string,
    amount: number,
    currency: string,
    roomNumber: string,
    message?: string,
  ) {
    const formatted = `$${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
    const html = this.wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">You Received a Tip!</h2>
      <p style="color:#374151;line-height:1.6;">Hi ${staffName},</p>
      <p style="color:#374151;line-height:1.6;">Great news! A guest has left you a tip.</p>
      <div style="margin:20px 0;padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
        <p style="margin:0 0 8px;font-size:28px;font-weight:700;color:#16a34a;text-align:center;">${formatted}</p>
        <p style="margin:0;color:#374151;text-align:center;font-size:14px;">Room ${roomNumber}</p>
        ${message ? `<p style="margin:12px 0 0;color:#6b7280;text-align:center;font-size:13px;font-style:italic;">"${message}"</p>` : ''}
      </div>
      <p style="color:#6b7280;font-size:13px;">Log in to your dashboard to see your full earnings.</p>
    `);
    await this.send(to, `You received a ${formatted} tip! - Tipper`, html);
  }

  async sendWelcomeEmail(to: string, name: string, tempPassword: string) {
    const loginUrl = `${env.CORS_ORIGIN}/login`;
    const html = this.wrap(`
      <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Welcome to Tipper!</h2>
      <p style="color:#374151;line-height:1.6;">Hi ${name},</p>
      <p style="color:#374151;line-height:1.6;">Your hotel has added you as a staff member on Tipper. Use the credentials below to log in for the first time.</p>
      <div style="margin:20px 0;padding:16px;background:#f3f4f6;border-radius:8px;">
        <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Email:</strong> ${to}</p>
        <p style="margin:0;color:#374151;font-size:14px;"><strong>Temporary Password:</strong> <code style="font-size:16px;font-weight:600;">${tempPassword}</code></p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${loginUrl}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Log In Now</a>
      </div>
      <p style="color:#6b7280;font-size:13px;">Please change your password after your first login.</p>
    `);
    await this.send(to, 'Welcome to Tipper - Your Account is Ready', html);
  }
}

export const emailService = new EmailService();
