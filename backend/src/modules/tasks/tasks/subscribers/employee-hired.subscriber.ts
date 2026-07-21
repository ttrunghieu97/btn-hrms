import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import {
  EVENT_BUS_TOKEN as EVENT_BUS,
  IEventBus as EventBus,
} from "../../../../core/events/event-bus.interface";
import { EmployeeHiredEvent } from "../../../../core/events/events/employee-hired.event";
import { CreateTaskUseCase } from "../use-cases/create-task.usecase";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";

const CONSUMER_ID = "tasks:employee_hired";

@Injectable()
export class TaskEmployeeHiredSubscriber implements OnModuleInit {
  private readonly logger: ContextLogger;

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    private readonly createTask: CreateTaskUseCase,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(
      requestContext,
      TaskEmployeeHiredSubscriber.name,
    );
  }

  onModuleInit() {
    this.eventBus.on(
      EmployeeHiredEvent.eventType,
      async (event: EmployeeHiredEvent) => {
        try {
          const { employeeId } = event.data;

          // Create onboarding checklist tasks for the new hire
          const tasks = [
            { title: "Hoàn thành hồ sơ nhân sự", description: "Nộp đầy đủ giấy tờ cá nhân theo yêu cầu" },
            { title: "Ký hợp đồng lao động", description: "Hoàn tất ký kết hợp đồng với bộ phận HR" },
            { title: "Tham gia bảo hiểm", description: "Đăng ký bảo hiểm xã hội, y tế" },
            { title: "Hướng dẫn an toàn lao động", description: "Tham gia buổi đào tạo an toàn lao động" },
            { title: "Giới thiệu đội nhóm", description: "Làm quen với quản lý và đồng nghiệp" },
            { title: "Thiết lập email & tài khoản nội bộ", description: "Kích hoạt tài khoản email công ty" },
          ];

          for (const task of tasks) {
            await this.createTask.execute({
              title: task.title,
              description: task.description,
              assigneeId: employeeId,
              priority: "medium",
            });
          }

          this.logger.log({
            event: "tasks_onboarding_created",
            employeeId,
            taskCount: tasks.length,
          });
        } catch (err) {
          this.logger.error({
            event: "tasks_onboarding_failed",
            employeeId: event.data.employeeId,
            error: String(err),
          });
        }
      },
    );
  }
}
