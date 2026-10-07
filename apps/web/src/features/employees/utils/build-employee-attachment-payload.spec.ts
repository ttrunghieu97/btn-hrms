import { buildEmployeeAttachmentPayload } from './build-employee-attachment-payload';
import type { EmployeeDocumentFormField, EmployeeCertificationFormField } from './employee-form-model';

function makeDoc(overrides: Partial<EmployeeDocumentFormField> & { id: string; documentType: string }): EmployeeDocumentFormField {
  return { label: '', checked: true, ...overrides };
}

function makeCert(overrides: Partial<EmployeeCertificationFormField> & { name: string; issuedBy: string; issuedDate: string } & { id: string }): EmployeeCertificationFormField {
  return { expiredDate: '', ...overrides };
}

describe('buildEmployeeAttachmentPayload', () => {
  it('keeps existing attachments when no replacement file is selected', () => {
    const payload = buildEmployeeAttachmentPayload({
      documents: [
        makeDoc({ id: 'd1', documentType: 'resume', attachmentId: 'att-resume' }),
      ],
      certifications: [
        makeCert({ id: 'cert-1', name: 'AWS', issuedBy: 'Amazon', issuedDate: '2026-01-01', evidenceAttachmentId: 'att-cert' }),
      ],
    });

    expect(payload.avatar).toBeUndefined();
    expect(payload.documents).toEqual([
      { documentType: 'resume', mode: 'keep', attachmentId: 'att-resume' },
    ]);
    expect(payload.certifications).toEqual([
      {
        name: 'AWS',
        issuedBy: 'Amazon',
        issuedDate: '2026-01-01',
        evidence: { mode: 'keep', attachmentId: 'att-cert' },
      },
    ]);
  });

  it('maps avatar existing via attachmentId to keep', () => {
    const payload = buildEmployeeAttachmentPayload({
      avatarAttachmentId: 'att-avatar-1',
      documents: [],
      certifications: [],
    });
    expect(payload.avatar).toEqual({ mode: 'keep', attachmentId: 'att-avatar-1' });
  });

  it('maps a staged avatar to replace', () => {
    const payload = buildEmployeeAttachmentPayload({
      avatarAttachmentId: 'att-avatar-1',
      avatarFile: new File(['avatar'], 'avatar.png', { type: 'image/png' }),
      avatarTempFileToken: 'tmp-avatar',
      documents: [],
      certifications: [],
    });
    expect(payload.avatar).toEqual({
      mode: 'replace',
      tempFileToken: 'tmp-avatar',
    });
  });

  it('maps staged document and certification evidence to replace', () => {
    const payload = buildEmployeeAttachmentPayload({
      documents: [
        makeDoc({
          id: 'resume',
          documentType: 'resume',
          attachmentId: 'att-resume',
          tempFileToken: 'tmp-resume',
        }),
      ],
      certifications: [
        makeCert({
          id: 'cert-local',
          name: 'AWS',
          issuedBy: 'Amazon',
          issuedDate: '2026-01-01',
          evidenceTempFileToken: 'tmp-cert',
        }),
      ],
    });

    expect(payload.documents).toEqual([
      {
        documentType: 'resume',
        mode: 'replace',
        tempFileToken: 'tmp-resume',
      },
    ]);
    expect(payload.certifications).toEqual([
      {
        name: 'AWS',
        issuedBy: 'Amazon',
        issuedDate: '2026-01-01',
        evidence: {
          mode: 'replace',
          tempFileToken: 'tmp-cert',
        },
      },
    ]);
  });

  it('maps no avatar input to undefined', () => {
    const payload = buildEmployeeAttachmentPayload({
      documents: [],
      certifications: [],
    });
    expect(payload.avatar).toBeUndefined();
  });

  it('removes an existing document when it is unchecked', () => {
    const payload = buildEmployeeAttachmentPayload({
      documents: [
        makeDoc({ id: 'd1', documentType: 'resume', checked: false, attachmentId: 'att-resume' }),
      ],
      certifications: [],
    });
    expect(payload.documents).toEqual([
      { documentType: 'resume', mode: 'remove', attachmentId: 'att-resume' },
    ]);
  });

  it('skips incomplete certifications', () => {
    const payload = buildEmployeeAttachmentPayload({
      documents: [],
      certifications: [
        makeCert({ id: 'c1', name: '', issuedBy: '', issuedDate: '' }),
      ],
    });
    expect(payload.certifications).toBeUndefined();
  });
});
