import nodemailer from 'nodemailer';

export async function sendEmail(to: string, subject: string, html: string) {
  const transporter = (() => {
    const service = process.env.EMAIL_SERVICE?.toLowerCase();
    // GMAIL (Recommended for Personal Accounts)
    if (service === 'gmail') {
      return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Use SSL
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }

    // PERSONAL OUTLOOK / HOTMAIL (Explicit)
    if (service === 'outlook' || service === 'hotmail') {
        return nodemailer.createTransport({
            host: "smtp-mail.outlook.com", // Specific host for personal accounts
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                ciphers: undefined 
            }
        });
    }

    // DEFAULT / OFFICE 365 (School/Work)
    return nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false, // TLS requires secure: false + starttls
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
          ciphers: undefined 
      }
    });
  })();

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("❌ Email configuration missing (EMAIL_USER or EMAIL_PASS).");
      throw new Error("Email configuration missing.");
  }
  // Verify connection configuration
  try {
    await new Promise((resolve, reject) => {
      transporter.verify(function (error, success) {
        if (error) {
          console.error("❌ SMTP Connection Error:", error);
          reject(error);
        } else {
          resolve(success);
        }
      });
    });
  } catch (err) {
    console.error("❌ ABORTING EMAIL: SMTP Check Failed.");
    throw err;
  }

  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${process.env.EMAIL_USER?.split('@')[1] || 'isite-plus.com'}>`;
  
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    replyTo: process.env.EMAIL_USER,
    subject,
    text: html.replace(/<[^>]*>/g, ''), // Plain text fallback
    html,
    messageId,
  });
}
