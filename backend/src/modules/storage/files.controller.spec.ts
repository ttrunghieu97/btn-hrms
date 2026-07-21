import { Test, type TestingModule } from "@nestjs/testing";
import { FilesController } from "./files.controller";
import { RequestContextService } from "../../shared/context/request-context.service";
import { ServeFileUseCase } from "./use-cases/serve-file.usecase";

describe(FilesController.name, () => {
  let controller: FilesController;

  const serveFileUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: RequestContextService,
          useValue: { get: jest.fn(() => ({ requestId: "test" })) },
        },
        { provide: ServeFileUseCase, useValue: serveFileUseCase },
      ],
    }).compile();

    controller = module.get(FilesController);
  });

  function createRes() {
    return {
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
      setHeader: jest.fn(),
      redirect: jest.fn(),
      on: jest.fn(),
      destroy: jest.fn(),
      headersSent: false,
      writableEnded: false,
    };
  }

  function createReq(overrides: Record<string, unknown> = {}) {
    return {
      originalUrl: "/api/v1/files/employees/avatar.jpg",
      url: "/files/employees/avatar.jpg",
      path: "/files/employees/avatar.jpg",
      params: {},
      headers: {},
      user: { id: "user-1", permissions: ["employees:view"] },
      ...overrides,
    };
  }

  it("returns 404 for invalid keys", async () => {
    const res = createRes();
    const req = createReq({
      originalUrl: "/api/v1/files/../../etc/passwd",
    });

    await controller.getFile(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(serveFileUseCase.execute).not.toHaveBeenCalled();
  });

  it("serves file stream from use case", async () => {
    const res = createRes();
    const req = createReq();
    const stream = {
      on: jest.fn(),
      pipe: jest.fn(),
    };

    serveFileUseCase.execute.mockResolvedValue({
      type: "stream",
      stream,
      contentType: "image/jpeg",
      sizeBytes: 1024,
    });

    await controller.getFile(req as any, res as any);

    expect(serveFileUseCase.execute).toHaveBeenCalledWith("employees/avatar.jpg", req.user);
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/jpeg");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Length", "1024");
    expect(stream.pipe).toHaveBeenCalledWith(res);
  });

  it("throws if user not authenticated", async () => {
    const res = createRes();
    const req = createReq({ user: undefined });

    await expect(controller.getFile(req as any, res as any)).rejects.toThrow();
  });
});
