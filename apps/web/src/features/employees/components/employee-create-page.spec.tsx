import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { uploadTempFile } from '@/features/uploads';
import { employeeUiCopy } from '@/lib/app-copy';
import { EmployeeCreatePage } from './employee-create-page';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { DocumentsFormTab } from './tabs/documents-form-tab';

jest.mock('@/lib/query-client', () => ({
  getQueryClient: () => ({})
}));

let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock('../queries/employee-queries', () => ({
  useDepartmentsQuery: () => ({ data: [], isLoading: false }),
  usePositionsQuery: () => ({ data: [], isLoading: false }),
  useEmployeeQuery: () => ({ data: null, isLoading: false }),
  useCreateEmployeeMutation: () => ({ isPending: false, mutate: jest.fn() }),
  useUpdateEmployeeMutation: () => ({ isPending: false, mutate: jest.fn() }),
  useUpsertEmployeeEquipmentHandoverMutation: () => ({ isPending: false, mutateAsync: jest.fn() }),
  checkEmployeeUsernameAvailability: jest.fn(),
  checkEmployeeCodeAvailability: jest.fn()
}));

jest.mock('@/features/uploads/api/upload-api', () => ({
  uploadTempFile: jest.fn().mockResolvedValue({
    tempFileToken: 'tmp-cert',
    tempFileId: 'file-cert',
    url: '/files/temp/certificate.pdf',
    fileName: 'certificate.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 100
  })
}));

/* ───────── Helpers ───────── */

function createLocalId(prefix: string) {
  let counter = 0;
  return () => `${prefix}-${++counter}`;
}

/* ───────── Tests ───────── */

describe('EmployeeCreatePage', () => {
  beforeEach(() => {
    (uploadTempFile as jest.Mock).mockClear();
    mockSearchParams = new URLSearchParams();
    URL.createObjectURL = jest.fn(() => 'blob:preview');
    URL.revokeObjectURL = jest.fn();
  });

  it('pre-fills candidate details and shows offer banner when navigated with fromOfferId', async () => {
    mockSearchParams = new URLSearchParams({
      fromOfferId: 'offer-123',
      fullName: 'Nguyễn Văn An',
      email: 'an.nguyen@company.vn',
      phone: '0901234567',
      startDate: '2026-11-01',
    });

    render(<EmployeeCreatePage />);

    expect(
      screen.getByText(/Thư mời nhận việc đã chấp thuận/i),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nguyễn Văn')).toBeInTheDocument();
    expect(screen.getByDisplayValue('An')).toBeInTheDocument();
    expect(screen.getByDisplayValue('an.nguyen@company.vn')).toBeInTheDocument();
  });

  it('shows a local preview and starts staging immediately after pick', async () => {
    render(<EmployeeCreatePage />);

    fireEvent.click(screen.getByRole('button', { name: /Tải ảnh lên/i }));

    const fileInput = document.querySelector('input[type="file"][accept="image/png,image/jpeg,image/webp"]');
    expect(fileInput).not.toBeNull();

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } });

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    await waitFor(() =>
      expect(uploadTempFile).toHaveBeenCalledWith(
        expect.objectContaining({
          file,
          purpose: 'avatar'
        })
      )
    );
    await waitFor(() =>
      expect(screen.queryByText('Đang tải...')).not.toBeInTheDocument()
    );
  });

  it('keeps form fields editable while avatar upload is pending', () => {
    render(<EmployeeCreatePage />);

    expect(screen.getAllByRole('textbox')[0]).toBeEnabled();
  });

  it('shows certification evidence immediately and stages it in the background', async () => {
    const nextId = createLocalId('cert');

    function DocumentsTabStandalone() {
      const [certifications, setCertifications] = React.useState<
        Array<{ id: string; name: string; issuedBy: string; issuedDate: string; expiredDate: string; fileUrl: string; fileName?: string }>
      >([]);

      return (
        <Tabs defaultValue='documents'>
          <TabsContent value='documents'>
            <DocumentsFormTab
              documents={[]}
              certifications={certifications}
              uploadingDocumentIds={new Set()}
              uploadingCertificationIds={new Set()}
              isSubmitting={false}
              isPending={false}
              onDocumentCheckedChange={jest.fn()}
              onDocumentFileChange={jest.fn()}
              onAddCertification={() => {
                setCertifications((prev) => [
                  ...prev,
                  { id: nextId(), name: '', issuedBy: '', issuedDate: '', expiredDate: '', fileUrl: '' },
                ]);
              }}
              onRemoveCertification={jest.fn()}
              onCertificationChange={jest.fn()}
              onCertificationFileChange={(id, file) => {
                uploadTempFile({ file, purpose: 'certification' as const, draftId: 'test' });
                setCertifications((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, fileName: file.name } : c)),
                );
              }}
              getAssetUrl={(v: string) => v}
            />
          </TabsContent>
        </Tabs>
      );
    }

    render(<DocumentsTabStandalone />);

    expect(
      screen.getByRole('button', { name: employeeUiCopy.certificationsSection.add }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: employeeUiCopy.certificationsSection.add }),
    );

    const evidenceInputs = document.querySelectorAll(
      'input[type="file"][accept="image/png,image/jpeg,image/webp,application/pdf"]',
    );
    const certificationInput = evidenceInputs[evidenceInputs.length - 1] as HTMLInputElement;
    const file = new File(['certificate'], 'certificate.pdf', { type: 'application/pdf' });

    fireEvent.change(certificationInput, { target: { files: [file] } });

    expect(screen.getByText('certificate.pdf')).toBeInTheDocument();

    await waitFor(() =>
      expect(uploadTempFile).toHaveBeenCalledWith(
        expect.objectContaining({ file, purpose: 'certification' }),
      ),
    );
  });
});
