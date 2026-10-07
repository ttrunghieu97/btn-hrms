import { http, HttpResponse } from 'msw';
import { createPayrollPeriodFactory, createPayrollRunFactory } from '../../factories/payroll.factory';

const period = createPayrollPeriodFactory();
const run = createPayrollRunFactory();

export const payrollHandlers = [
  http.get('/api/v1/payroll/periods', () =>
    HttpResponse.json({
      data: [period],
      meta: { pagination: { page: 1, limit: 10, total: 1, hasNext: false } },
      error: null,
    }),
  ),

  http.get('/api/v1/payroll/runs', () =>
    HttpResponse.json({
      data: [run],
      meta: { pagination: { page: 1, limit: 10, total: 1, hasNext: false } },
      error: null,
    }),
  ),
];
