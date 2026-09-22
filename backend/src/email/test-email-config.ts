import * as nodemailer from 'nodemailer';

const log = (...messages: unknown[]) => {
  process.stdout.write(messages.map((message) => String(message)).join(' ') + '\n');
};

const logError = (...messages: unknown[]) => {
  process.stderr.write(messages.map((message) => String(message)).join(' ') + '\n');
};

// Simple test to verify email configuration
async function testEmailConfig() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpSecure = process.env.SMTP_SECURE === 'true';

  log('Email Configuration:');
  log('SMTP_HOST:', smtpHost);
  log('SMTP_PORT:', smtpPort);
  log('SMTP_USER:', smtpUser);
  log('SMTP_SECURE:', smtpSecure);

  if (!smtpHost || !smtpUser || !smtpPassword) {
    logError('Missing required email configuration!');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
  });

  try {
    await transporter.verify();
    log('✅ Email configuration is valid!');
  } catch (error) {
    logError('❌ Email configuration failed:', error instanceof Error ? error.message : String(error));
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEmailConfig();
}
