import {  Inject , Injectable } from "@nestjs/common";
import { sql, type SQL } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import { AppDatabase } from "../../../../infrastructure/database/database-client.type";

type AssigneeReportRow = {
  assignee_id: string;
  employee_code: string | null;
  assignee_name: string | null;
  department_name: string | null;
  total_assigned: number | string;
  completed_count: number | string;
  active_count: number | string;
  overdue_count: number | string;
  on_time_completed_count: number | string;
  avg_completion_hours: number | string | null;
};

@Injectable()
export class TaskAssigneePerformanceReportRepository {

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: AppDatabase) {
    this.db = this.db;
  }

  run(query: {
    departmentId?: string;
    assigneeId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const conditions: SQL<any>[] = [
      sql`t.deleted_at is null`,
      sql`t.assignee_id is not null`,
    ];

    if (query.departmentId) {
      conditions.push(sql`e.department_id = ${query.departmentId}`);
    }
    if (query.assigneeId) {
      conditions.push(sql`t.assignee_id = ${query.assigneeId}`);
    }
    if (query.startDate) {
      conditions.push(sql`t.created_at >= ${new Date(query.startDate)}`);
    }
    if (query.endDate) {
      const endExclusive = new Date(query.endDate);
      endExclusive.setDate(endExclusive.getDate() + 1);
      conditions.push(sql`t.created_at < ${endExclusive}`);
    }

    const whereSql = sql`where ${sql.join(conditions, sql` and `)}`;

    return this.db.execute<AssigneeReportRow>(sql`
      select
        t.assignee_id as assignee_id,
        e.employee_code as employee_code,
        trim(concat(coalesce(e.last_name, ''), ' ', coalesce(e.first_name, ''))) as assignee_name,
        d.name as department_name,
        count(*)::int as total_assigned,
        count(*) filter (where t.status = 'completed')::int as completed_count,
        count(*) filter (where t.status in ('created', 'assigned', 'in_progress', 'submitted', 'revision'))::int as active_count,
        count(*) filter (where t.status <> 'completed' and t.due_date is not null and t.due_date < now())::int as overdue_count,
        count(*) filter (where t.status = 'completed' and t.completed_at is not null and t.due_date is not null and t.completed_at <= t.due_date)::int as on_time_completed_count,
        coalesce(avg(extract(epoch from (t.completed_at - t.created_at)) / 3600) filter (where t.status = 'completed' and t.completed_at is not null), 0)::float as avg_completion_hours
      from tasks t
      left join employees e on e.id = t.assignee_id
      left join departments d on d.id = e.department_id
      ${whereSql}
      group by t.assignee_id, e.employee_code, e.first_name, e.last_name, d.name
      order by total_assigned desc, completed_count desc
    `);
  }
}

