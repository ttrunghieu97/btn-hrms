import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class SmsDeliveryService {
  private readonly logger = new Logger(SmsDeliveryService.name);

  async sendSms(input: { userId: string; body: string }) {
    // Provider integration intentionally stubbed for now (Twilio, etc.)
    this.logger.log(`Simulated SMS send userId=${input.userId}`);
    return { provider: "simulated" as const };
  }
}




