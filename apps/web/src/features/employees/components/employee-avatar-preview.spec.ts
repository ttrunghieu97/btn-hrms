import { resolveEmployeeAvatarSrc } from './form/employee-avatar-preview';

describe('resolveEmployeeAvatarSrc', () => {
  it('keeps blob preview until uploaded asset has loaded', () => {
    expect(
      resolveEmployeeAvatarSrc({
        localPreviewUrl: 'blob:preview',
        uploadedPreviewUrl: '/api/files/temp/file-1.png',
        uploadedPreviewLoaded: false
      })
    ).toBe('blob:preview');
  });

  it('switches to uploaded asset after it has loaded', () => {
    expect(
      resolveEmployeeAvatarSrc({
        localPreviewUrl: 'blob:preview',
        uploadedPreviewUrl: '/api/files/temp/file-1.png',
        uploadedPreviewLoaded: true
      })
    ).toBe('/api/files/temp/file-1.png');
  });
});

