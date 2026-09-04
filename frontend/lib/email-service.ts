import { api } from './api';

export interface SendEmailData {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: string;
    encoding?: string;
  }>;
}

export interface EmailResponse {
  success: boolean;
  message: string;
  emailId?: string;
}

class EmailService {
  async sendEmail(data: SendEmailData): Promise<EmailResponse> {
    try {
      const response = await api.post('/email/send', data);
      return response.data;
    } catch (error: any) {
      console.error('Email sending failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send email'
      };
    }
  }

  async getEmailTemplates(): Promise<any[]> {
    try {
      const response = await api.get('/email/templates');
      return response.data;
    } catch (error) {
      console.error('Failed to get email templates:', error);
      return [];
    }
  }
}

export const emailService = new EmailService();
