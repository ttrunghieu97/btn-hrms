import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class PushDeliveryService {
  private readonly logger = new Logger(PushDeliveryService.name);

  async sendPush(input: { userId: string; title?: string; body: string }) {
    // Provider integration intentionally stubbed for now (FCM/APNs, etc.)
    this.logger.log(`Simulated push send userId=${input.userId}`);
    return { provider: "simulated" as const };
  }
}




