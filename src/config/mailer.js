import nodemailer from 'nodemailer';

export function createMailer() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: false,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return {
    async sendMail(to, subject, html) {
      await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
    }
  };
}
