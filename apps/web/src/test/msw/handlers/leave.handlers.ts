import { http, HttpResponse } from 'msw';
import { createLeaveRequestResponseFactory } from '../../factories/leave.factory';

const leaveRequest = createLeaveRequestResponseFactory();

export const leaveHandlers = [
  http.get('/api/v1/leave/requests', () =>
    HttpResponse.json({
      data: [leaveRequest],
      meta: { pagination: { page: 1, limit: 10, total: 1, hasNext: false } },
      error: null,
    }),
  ),

  http.post('/api/v1/leave/requests', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { data: { ...leaveRequest, ...(body as object) }, error: null },
      { status: 201 },
    );
  }),
];
