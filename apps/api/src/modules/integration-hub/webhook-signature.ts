import { createHmac } from "crypto";

export function signWebhookPayload(secret: string, body: string) {
  const signature = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return `sha256=${signature}`;
}
