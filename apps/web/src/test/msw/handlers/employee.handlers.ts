import { http, HttpResponse } from 'msw';
import { createEmployeeFactory } from '../../factories/employee.factory';

const employee = createEmployeeFactory();

/**
 * MSW handlers for employee API endpoints.
 * Add/remove handlers as feature coverage expands.
 */
export const employeeHandlers = [
  // GET /api/v1/employees — list
  http.get('/api/v1/employees', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 10);

    return HttpResponse.json({
      data: [employee],
      meta: { pagination: { page, limit, total: 1, hasNext: false } },
      error: null,
    });
  }),

  // GET /api/v1/employees/:id — detail
  http.get('/api/v1/employees/:id', () => {
    return HttpResponse.json({
      data: employee,
      error: null,
    });
  }),

  // POST /api/v1/employees — create
  http.post('/api/v1/employees', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: { ...employee, ...(body as object) },
      error: null,
    }, { status: 201 });
  }),
];
