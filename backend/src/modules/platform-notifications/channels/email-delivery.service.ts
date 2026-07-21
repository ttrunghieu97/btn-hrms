import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);

  async sendEmail(input: { to: string; subject: string; body: string }) {
    // Provider integration intentionally stubbed for now (SES, SendGrid, etc.)
    this.logger.log(
      `Simulated email send to=${input.to} subject=${JSON.stringify(input.subject)}`,
    );
    return { provider: "simulated" as const };
  }
}




