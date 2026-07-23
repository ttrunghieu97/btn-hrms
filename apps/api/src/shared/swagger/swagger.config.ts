import { DocumentBuilder } from "@nestjs/swagger";

export const SWAGGER_DOCS_PATH = "api/v1/docs";

export const buildSwaggerConfig = () =>
  new DocumentBuilder()
    .setTitle("BTN HRMS API")
    .setDescription("The Human Resource Management System API description")
    .setVersion("1.0")
    .addBearerAuth()
    .addApiKey(
      {
        type: "apiKey",
        name: "x-request-id",
        in: "header",
        description:
          "Optional request id. If omitted, the server generates one and returns it in x-request-id.",
      },
      "x-request-id",
    )
    .build();
