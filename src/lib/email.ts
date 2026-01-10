import nodemailer from 'nodemailer';

export async function sendEmail(to: string, subject: string, html: string) {
  // Use environment variables or fallback to a test account if mocking
  // Since we cannot see .env, we assume variables exist or we log the clear limitation.
  
  // Choose transport based on EMAIL_SERVICE env var (default: Outlook)
  const transporter = (() => {
    const service = process.env.EMAIL_SERVICE?.toLowerCase();
    if (service === 'gmail') {
      // Gmail service (uses OAuth2 or simple user/pass)
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }
    // Outlook / Office 365 fallback
    return nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,
      },
    });
  })();

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("❌ Email configuration missing (EMAIL_USER or EMAIL_PASS).");
      throw new Error("Email configuration missing."); 
  }

  console.log(`📧 Attempting to send email to ${to} using ${process.env.EMAIL_SERVICE || 'outlook'}...`);

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
  
  console.log(`✅ Email sent successfully to ${to}`);
}
