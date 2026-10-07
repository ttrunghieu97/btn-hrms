import { fireEvent, render } from '@testing-library/react';
import { EmployeeCertificationsSection } from './form/employee-certifications-section';

describe('EmployeeCertificationsSection', () => {
  it('routes the selected file directly to its certification', () => {
    const onFileChange = jest.fn();
    const { container } = render(
      <EmployeeCertificationsSection
        certifications={[
          {
            id: 'cert-1',
            name: '',
            issuedBy: '',
            issuedDate: '',
            expiredDate: '',
            image: '',
            fileName: '',
          },
        ]}
        isEditing
        isSavePending={false}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
        onFieldChange={jest.fn()}
        onFileChange={onFileChange}
      />,
    );

    const file = new File(['certificate'], 'certificate.pdf', {
      type: 'application/pdf',
    });
    const input = container.querySelector('input[type="file"]');

    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    expect(onFileChange).toHaveBeenCalledWith('cert-1', file);
  });
});

