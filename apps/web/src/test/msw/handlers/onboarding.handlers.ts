import { http, HttpResponse } from 'msw';
import { createOnboardingProcessFactory, createOnboardingTemplateFactory } from '../../factories/onboarding.factory';

const process = createOnboardingProcessFactory();
const template = createOnboardingTemplateFactory();

export const onboardingHandlers = [
  http.get('/api/v1/onboarding/processes', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    return HttpResponse.json({
      data: { rows: [process], pagination: { page, limit, total: 1 } },
      error: null,
    });
  }),

  http.get('/api/v1/onboarding/processes/:id', ({ params }) => {
    if (params.id === 'not-found') {
      return HttpResponse.json({ error: { message: 'Not found' } }, { status: 404 });
    }
    return HttpResponse.json({ data: process, error: null });
  }),

  http.get('/api/v1/onboarding/templates', () =>
    HttpResponse.json({ data: [template], error: null }),
  ),

  http.get('/api/v1/onboarding/templates/:id', () =>
    HttpResponse.json({ data: template, error: null }),
  ),

  http.post('/api/v1/onboarding/processes', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { data: { ...process, ...(body as object) }, error: null },
      { status: 201 },
    );
  }),

  http.post('/api/v1/onboarding/templates', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { data: { ...template, ...(body as object) }, error: null },
      { status: 201 },
    );
  }),
];
