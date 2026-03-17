import { Module } from '@nestjs/common';
import { EmailService } from './email/email.service';
import { SmsService } from './sms/sms.service';

@Module({
  providers: [EmailService, SmsService],
  exports: [EmailService, SmsService],
})
export class NotificationsModule {}
