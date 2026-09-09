import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    const smtpSecure = this.configService.get<boolean>('SMTP_SECURE', false);

    // Check if required SMTP configuration is provided
    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.warn('SMTP configuration is incomplete. Email functionality will be limited.');
      console.warn('Missing:', {
        SMTP_HOST: !smtpHost,
        SMTP_USER: !smtpUser,
        SMTP_PASSWORD: !smtpPassword,
      });
    }

    // Enhanced configuration for Gmail and other providers
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      // Additional options for Gmail
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      },
      // Connection timeout
      connectionTimeout: 60000, // 60 seconds
      // Socket timeout
      socketTimeout: 60000, // 60 seconds
      // Greeting timeout
      greetingTimeout: 30000, // 30 seconds
    });

    // Verify connection configuration
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
    } catch (error) {
      // Authentication or connection errors will be handled when actually sending emails
    }
  }

  private async sendMail(mailOptions: nodemailer.SendMailOptions): Promise<void> {
    // Check if SMTP is properly configured
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');

    if (!smtpHost || !smtpUser || !smtpPassword) {
      throw new Error('Email service is not configured. Please contact support.');
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
    } catch (error) {
      if (error.code === 'EAUTH') {
        throw new Error('Email authentication failed. Please check your SMTP credentials. For Zoho Mail, ensure IMAP access is enabled and you may need to use an App Password.');
      } else if (error.code === 'ECONNECTION') {
        throw new Error('Failed to connect to email server. Please check your SMTP configuration.');
      } else {
        throw new Error(`Failed to send email: ${error.message}`);
      }
    }
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_1_URL') || this.configService.get<string>('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    await this.sendMail({
      from: `${this.configService.get<string>('FROM_NAME')} <${this.configService.get<string>('FROM_EMAIL')}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>Welcome! Please verify your email address</h2>
          <p>Thank you for registering. Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
      `,
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_1_URL') || this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    await this.sendMail({
      from: `${this.configService.get<string>('FROM_NAME')} <${this.configService.get<string>('FROM_EMAIL')}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>Password Reset Request</h2>
          <p>You have requested to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
        </div>
      `,
    });
  }

  async sendInvitation(email: string, token: string, invitedBy: string, organizationName: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_1_URL') || this.configService.get<string>('FRONTEND_URL');
    const invitationUrl = `${frontendUrl}/accept-invitation?token=${token}`;

    await this.sendMail({
      from: `${this.configService.get<string>('FROM_NAME')} <${this.configService.get<string>('FROM_EMAIL')}>`,
      to: email,
      subject: `You're invited to join ${organizationName}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>You're Invited!</h2>
          <p>${invitedBy} has invited you to join <strong>${organizationName}</strong>.</p>
          <p>Click the button below to accept the invitation and create your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" 
               style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p><a href="${invitationUrl}">${invitationUrl}</a></p>
          <p>This invitation will expire in 7 days.</p>
          <p>If you don't want to join this organization, you can safely ignore this email.</p>
        </div>
      `,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    await this.sendMail({
      from: `${this.configService.get<string>('FROM_NAME')} <${this.configService.get<string>('FROM_EMAIL')}>`,
      to: email,
      subject: 'Welcome to our Platform!',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2>Welcome, ${firstName}!</h2>
          <p>Your account has been successfully created and verified.</p>
          <p>You can now start using our platform to manage your inventory and point of sale operations.</p>
          <p>If you have any questions, feel free to contact our support team.</p>
          <p>Thank you for choosing our platform!</p>
        </div>
      `,
    });
  }
}
