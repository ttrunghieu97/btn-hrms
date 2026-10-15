import { Injectable, Logger } from "@nestjs/common";
import type { ChannelDeliveryResult } from "./email-delivery.service";

@Injectable()
export class SmsDeliveryService {
  private readonly logger = new Logger(SmsDeliveryService.name);

  async sendSms(input: {
    userId: string;
    body: string;
  }): Promise<ChannelDeliveryResult> {
    // Provider integration intentionally stubbed for now (Twilio, etc.)
    this.logger.log(`Simulated SMS send userId=${input.userId}`);
    return {
      provider: "simulated" as const,
      simulated: true,
      deliveryState: "simulated",
      externalDelivery: false,
    };
  }

  getDiagnostics() {
    return {
      channel: "sms" as const,
      provider: "simulated" as const,
      configured: false,
      simulated: true,
    };
  }
}




