import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST'),
      port: this.configService.get('MAIL_PORT'),
      secure: this.configService.get('MAIL_SECURE'),
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });
  }

  private async sendEmail(to: string, subject: string, templateName: string, context: any) {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    const html = template(context);

    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM'),
      to,
      subject,
      html,
    });
  }

  async sendWelcomeEmail(user: any) {
    await this.sendEmail(user.email, 'Welcome to TownBolt! 🎉', 'welcome', {
      name: user.firstName,
      loginUrl: `${this.configService.get('FRONTEND_URL')}/auth/login`,
    });
  }

  async sendOrderConfirmedEmail(user: any, order: any) {
    const to = typeof user === 'string' ? user : user.email; // userId or user object
    await this.sendEmail(to, `Order Confirmed - ${order.orderNumber}`, 'order-confirmed', {
      order,
      customerName: user.firstName || 'Customer',
    });
  }

  async sendOrderShippedEmail(user: any, order: any) {
    await this.sendEmail(user.email, `Order Shipped - ${order.orderNumber}`, 'order-shipped', {
      order,
      customerName: user.firstName,
    });
  }

  async sendPasswordResetEmail(user: any, resetUrl: string) {
    await this.sendEmail(user.email, 'Password Reset Request', 'reset-password', {
      name: user.firstName,
      resetUrl,
    });
  }

  async sendOTP(email: string, otp: string) {
    await this.sendEmail(email, 'Your TownBolt OTP', 'otp', { otp });
  }
}
