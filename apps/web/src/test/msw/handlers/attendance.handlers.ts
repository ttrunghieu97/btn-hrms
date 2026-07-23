import { http, HttpResponse } from 'msw';
import { createAttendanceFactory } from '../../factories/attendance.factory';

const attendance = createAttendanceFactory();

export const attendanceHandlers = [
  http.get('/api/v1/attendances', () =>
    HttpResponse.json({
      data: [attendance],
      meta: { pagination: { page: 1, limit: 10, total: 1, hasNext: false } },
      error: null,
    }),
  ),

  http.get('/api/v1/attendances/presence', () =>
    HttpResponse.json({
      data: [],
      meta: { pagination: { page: 1, limit: 50, total: 0, hasNext: false } },
      error: null,
    }),
  ),
];
