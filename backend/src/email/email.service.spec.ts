import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService demonstration transport', () => {
  it('sends through the local JSON transport without opening a network connection', async () => {
    const config = new ConfigService({
      NODE_ENV: 'test',
      EMAIL_TRANSPORT: 'json',
      FRONTEND_1_URL: 'http://127.0.0.1:3100',
      FROM_NAME: 'BusOS Demo',
      FROM_EMAIL: 'demo@busos.local',
    });
    const service = new EmailService(config);

    await expect(service.sendWelcomeEmail('student@busos.local', 'Student')).resolves.toBeUndefined();
  });

  it('reports missing SMTP configuration instead of silently claiming delivery', async () => {
    const service = new EmailService(new ConfigService({ NODE_ENV: 'test' }));

    await expect(service.sendWelcomeEmail('student@busos.local', 'Student')).rejects.toThrow(
      'Email service is not configured',
    );
  });
});
