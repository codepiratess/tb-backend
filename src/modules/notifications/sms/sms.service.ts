import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
// import axios from 'axios' // Fast2SMS — uncomment when ready

@Injectable()
export class SmsService {
  private readonly logger = new Logger(
    SmsService.name
  )

  // ─────────────────────────────────────────
  // Fast2SMS config — uncomment when ready
  // ─────────────────────────────────────────
  // private readonly fast2smsUrl =
  //   'https://www.fast2sms.com/dev/bulkV2'
  // private readonly apiKey: string

  constructor(
    private configService: ConfigService
  ) {
    // this.apiKey = this.configService.get<string>(
    //   'FAST2SMS_API_KEY'
    // )
  }

  async sendOTP(
    phone: string,
    otp: string
  ): Promise<boolean> {

    // ─────────────────────────────────────────
    // TODO: Fast2SMS OTP — uncomment when
    // DLT registration is complete.
    // Steps to activate:
    // 1. Complete website verification on
    //    fast2sms.com (OTP Message menu)
    // 2. Get FAST2SMS_API_KEY from Dev API
    // 3. Add FAST2SMS_API_KEY to .env
    // 4. Uncomment the code below
    // ─────────────────────────────────────────

    // try {
    //   const response = await axios.get(
    //     this.fast2smsUrl,
    //     {
    //       params: {
    //         authorization: this.apiKey,
    //         variables_values: otp,
    //         route: 'otp',
    //         numbers: phone,
    //       },
    //       headers: {
    //         'cache-control': 'no-cache',
    //       },
    //       timeout: 10000,
    //     }
    //   )
    //   if (response.data?.return === true) {
    //     this.logger.log(
    //       `OTP sent via Fast2SMS to +91${phone}`
    //     )
    //     return true
    //   }
    //   this.logger.warn(
    //     `Fast2SMS failed: 
    //      ${JSON.stringify(response.data)}`
    //   )
    //   return false
    // } catch (error) {
    //   this.logger.error(
    //     `Fast2SMS error for ${phone}:`,
    //     error?.response?.data || error.message
    //   )
    //   return false
    // }

    // ─────────────────────────────────────────
    // DEV MODE — OTP logged to console only
    // Remove this block when Fast2SMS 
    // is activated above
    // ─────────────────────────────────────────
    this.logger.warn(
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    )
    this.logger.warn(
      `  📱 OTP for +91${phone} → ${otp}`
    )
    this.logger.warn(
      `  ⏰ Expires in ${
        this.configService.get(
          'OTP_EXPIRY_MINUTES'
        )
      } minutes`
    )
    this.logger.warn(
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    )
    return true
  }

  async sendOrderSMS(
    phone: string,
    orderNumber: string,
    status: string
  ): Promise<boolean> {

    // ─────────────────────────────────────────
    // TODO: Fast2SMS Order SMS — uncomment
    // when DLT registration is complete
    // ─────────────────────────────────────────

    // const messages: Record<string, string> = {
    //   confirmed:
    //     `TownBolt: Your order ${orderNumber}
    //      is confirmed! We will notify you
    //      when it ships.`,
    //   shipped:
    //     `TownBolt: Your order ${orderNumber}
    //      has been shipped and is on its way!`,
    //   delivered:
    //     `TownBolt: Your order ${orderNumber}
    //      has been delivered. Enjoy! Rate us
    //      on the app.`,
    //   cancelled:
    //     `TownBolt: Your order ${orderNumber}
    //      has been cancelled. Refund in
    //      5-7 business days.`,
    // }
    // try {
    //   const message = messages[status]
    //   if (!message) return false
    //   const response = await axios.get(
    //     this.fast2smsUrl,
    //     {
    //       params: {
    //         authorization: this.apiKey,
    //         message: message,
    //         language: 'english',
    //         route: 'q',
    //         numbers: phone,
    //       },
    //       headers: {
    //         'cache-control': 'no-cache',
    //       },
    //       timeout: 10000,
    //     }
    //   )
    //   if (response.data?.return === true) {
    //     this.logger.log(
    //       `Order SMS sent to +91${phone}
    //        for ${orderNumber}`
    //     )
    //     return true
    //   }
    //   return false
    // } catch (error) {
    //   this.logger.error(
    //     `Order SMS failed for ${phone}:`,
    //     error?.response?.data || error.message
    //   )
    //   return false
    // }

    // DEV MODE — just log for now
    this.logger.log(
      `[ORDER SMS - NOT SENT] ` +
      `+91${phone} | ${orderNumber} | ${status}`
    )
    return true
  }
}
