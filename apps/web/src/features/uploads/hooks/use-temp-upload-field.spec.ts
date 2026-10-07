import { buildUploadedFieldState, validateTempUploadFile } from './use-temp-upload-field';

describe('buildUploadedFieldState', () => {
  it('builds uploaded field state from temp upload result', () => {
    expect(
      buildUploadedFieldState({
        tempFileToken: 'tmp-avatar',
        tempFileId: 'file-avatar',
        url: '/files/temp/avatar.png',
        fileName: 'avatar.png',
        mimeType: 'image/png',
        sizeBytes: 1234
      })
    ).toEqual({
      status: 'uploaded',
      previewUrl: '/files/temp/avatar.png',
      fileName: 'avatar.png',
      tempFileToken: 'tmp-avatar',
      tempFileId: 'file-avatar',
      mimeType: 'image/png',
      sizeBytes: 1234
    });
  });
});

describe('validateTempUploadFile - avatar', () => {
  it('accepts image/jpeg for avatar', () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    expect(() => validateTempUploadFile(file, 'avatar')).not.toThrow();
  });

  it('accepts image/png for avatar', () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    expect(() => validateTempUploadFile(file, 'avatar')).not.toThrow();
  });

  it('accepts image/webp for avatar', () => {
    const file = new File(['x'], 'photo.webp', { type: 'image/webp' });
    expect(() => validateTempUploadFile(file, 'avatar')).not.toThrow();
  });

  it('rejects application/pdf for avatar', () => {
    const file = new File(['x'], 'resume.pdf', { type: 'application/pdf' });
    expect(() => validateTempUploadFile(file, 'avatar')).toThrow(
      'Dinh dang file khong hop le (chi nhan JPG, PNG, WEBP)'
    );
  });

  it('rejects oversized avatar (5MB + 1 byte)', () => {
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
    const file = new File([oversized], 'huge.jpg', { type: 'image/jpeg' });
    expect(() => validateTempUploadFile(file, 'avatar')).toThrow(
      'File vuot qua dung luong cho phep (5MB)'
    );
  });
});
