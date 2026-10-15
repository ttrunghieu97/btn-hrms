import { Injectable, Logger } from "@nestjs/common";

export type NotificationDeliveryState =
  | "queued"
  | "simulated"
  | "sent_to_provider"
  | "delivered"
  | "failed"
  | "unknown";

export interface ChannelDeliveryResult {
  provider: string;
  simulated: boolean;
  deliveryState: NotificationDeliveryState;
  externalDelivery: boolean;
}

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);

  async sendEmail(input: {
    to: string;
    subject: string;
    body: string;
  }): Promise<ChannelDeliveryResult> {
    // Provider integration intentionally stubbed for now (SES, SendGrid, etc.)
    this.logger.log(
      `Simulated email send to=${input.to} subject=${JSON.stringify(input.subject)}`,
    );
    return {
      provider: "simulated" as const,
      simulated: true,
      deliveryState: "simulated",
      externalDelivery: false,
    };
  }

  getDiagnostics() {
    return {
      channel: "email" as const,
      provider: "simulated" as const,
      configured: false,
      simulated: true,
    };
  }
}




