import { http, HttpResponse } from 'msw';
import { createPerformanceCycleFactory, createPerformanceGoalFactory } from '../../factories/performance.factory';

const cycle = createPerformanceCycleFactory();
const goal = createPerformanceGoalFactory();

export const performanceHandlers = [
  http.get('/api/v1/performance/cycles', () =>
    HttpResponse.json({ data: [cycle], error: null }),
  ),
  http.get('/api/v1/performance/cycles/:id', ({ params }) => {
    if (params.id === 'not-found') return HttpResponse.json({ error: { message: 'Not found' } }, { status: 404 });
    return HttpResponse.json({ data: cycle, error: null });
  }),
  http.post('/api/v1/performance/cycles', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ data: { ...cycle, ...(body as object) }, error: null }, { status: 201 });
  }),
  http.patch('/api/v1/performance/cycles/:id/:action', () =>
    HttpResponse.json({ data: { ...cycle, status: 'active' }, error: null }),
  ),
  http.get('/api/v1/performance/goals', () =>
    HttpResponse.json({ data: [goal], error: null }),
  ),
  http.post('/api/v1/performance/goals', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ data: { ...goal, ...(body as object) }, error: null }, { status: 201 });
  }),
];
