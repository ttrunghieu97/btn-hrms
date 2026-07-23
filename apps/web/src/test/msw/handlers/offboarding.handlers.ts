import { http, HttpResponse } from 'msw';
import { createOffboardingProcessFactory } from '../../factories/offboarding.factory';

const process = createOffboardingProcessFactory();

export const offboardingHandlers = [
  http.get('/api/v1/offboarding', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    return HttpResponse.json({
      data: { rows: [{ ...process, page, limit }], total: 1 },
      error: null,
    });
  }),

  http.get('/api/v1/offboarding/:id', ({ params }) => {
    if (params.id === 'not-found') {
      return HttpResponse.json({ error: { message: 'Not found' } }, { status: 404 });
    }
    return HttpResponse.json({ data: process, error: null });
  }),

  http.patch('/api/v1/offboarding/:processId/tasks/:taskId', () =>
    HttpResponse.json({ data: { success: true }, error: null }),
  ),

  http.post('/api/v1/offboarding/:processId/clearances/:department', () =>
    HttpResponse.json({ data: { success: true }, error: null }),
  ),

  http.post('/api/v1/offboarding/:processId/exit-interview', () =>
    HttpResponse.json({ data: { success: true }, error: null }, { status: 201 }),
  ),

  http.post('/api/v1/offboarding/:processId/complete', () =>
    HttpResponse.json({ data: { success: true }, error: null }),
  ),
];
