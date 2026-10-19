import { buildEmployeePayload, createFormValues } from './employee-detail-model';
import { createEmployeeCertificationFormSchema } from '../schemas/employee.schema';
import { validationCopy } from '@/lib/feedback-copy';

describe('employee-detail-model & certification schema', () => {
  describe('buildEmployeePayload', () => {
    it('strips cert- and local- prefixes from new certification IDs and sends evidence intent instead of attachment', () => {
      const baseValues = createFormValues(null);
      const payload = buildEmployeePayload({
        ...baseValues,
        firstName: 'An',
        lastName: 'Nguyen',
        employeeCode: 'EMP-001',
        departmentId: 'dept-1',
        positionId: 'pos-1',
        certifications: [
          {
            id: 'cert-12345',
            name: 'AWS Solutions Architect',
            issuedBy: 'Amazon',
            issuedDate: '2026-01-15',
            expiredDate: '2029-01-15',
            status: 'existing',
            tempFileToken: 'tmp-cert-token',
            fileUrl: '',
            fileName: 'aws.pdf',
          },
          {
            id: 'real-uuid-999',
            name: 'PMP',
            issuedBy: 'PMI',
            issuedDate: '2025-05-01',
            expiredDate: '',
            status: 'existing',
            attachmentId: 'att-existing-1',
            fileUrl: '/files/pmp.pdf',
            fileName: 'pmp.pdf',
          },
        ],
      });

      expect(payload.certifications).toEqual([
        {
          id: undefined,
          name: 'AWS Solutions Architect',
          issuedBy: 'Amazon',
          issuedDate: '2026-01-15',
          expiredDate: '2029-01-15',
          evidence: {
            mode: 'replace',
            tempFileToken: 'tmp-cert-token',
          },
        },
        {
          id: 'real-uuid-999',
          name: 'PMP',
          issuedBy: 'PMI',
          issuedDate: '2025-05-01',
          expiredDate: undefined,
          evidence: {
            mode: 'keep',
            attachmentId: 'att-existing-1',
          },
        },
      ]);
    });
  });

  describe('createEmployeeCertificationFormSchema', () => {
    it('allows completely empty certification row', () => {
      const res = createEmployeeCertificationFormSchema.safeParse({
        name: '   ',
        issuedBy: '',
        issuedDate: '',
        expiredDate: '',
      });
      expect(res.success).toBe(true);
    });

    it('requires issuedDate when name and issuedBy are provided', () => {
      const res = createEmployeeCertificationFormSchema.safeParse({
        name: 'IELTS',
        issuedBy: 'British Council',
        issuedDate: '',
        expiredDate: '',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['issuedDate'],
              message: validationCopy.employee.certificationIssuedDateRequired,
            }),
          ]),
        );
      }
    });

    it('requires name, issuedBy, and issuedDate when only expiredDate is entered', () => {
      const res = createEmployeeCertificationFormSchema.safeParse({
        name: '',
        issuedBy: '',
        issuedDate: '',
        expiredDate: '2027-01-01',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        const paths = res.error.issues.map((i) => i.path[0]);
        expect(paths).toEqual(['name', 'issuedBy', 'issuedDate']);
      }
    });
  });
});
