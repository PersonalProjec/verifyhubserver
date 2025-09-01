import nodemailer from 'nodemailer';

export function createMailer() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } =
    process.env;

  // secure=true for port 465; secure=false for 587 (TLS upgrade)
  const secure = String(SMTP_SECURE).toLowerCase() === 'true';

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || (secure ? 465 : 587)),
    secure, 
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    pool: true,
    maxConnections: 5, 
    maxMessages: 100,
    tls: {
      // SES requires TLSv1.2+
      minVersion: 'TLSv1.2',
      // leave true in prod; set to false only for debugging local cert issues
      rejectUnauthorized: true,
    },
  });

  // Optional: verify on boot (helpful during setup)
  async function verify() {
    try {
      await transporter.verify();
      console.log('✅ SMTP transporter verified');
    } catch (err) {
      console.error('❌ SMTP verify failed:', err.message);
    }
  }
  verify();

  return {
    async sendMail(to, subject, html, opts = {}) {
      return transporter.sendMail({
        from: SMTP_FROM, // must be a verified identity/domain in SES
        to,
        subject,
        html,
        text: opts.text ?? html?.replace(/<[^>]+>/g, ' ').trim(), // simple text fallback
        headers: opts.headers,
      });
    },
  };
}
