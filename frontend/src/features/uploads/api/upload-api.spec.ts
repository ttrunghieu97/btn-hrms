import { uploadTempFile } from './upload-api';

const uploadsControllerUploadTemp = jest.fn();

jest.mock('@/api/generated/endpoints', () => ({
  uploadsControllerUploadTemp: (...args: unknown[]) => uploadsControllerUploadTemp(...args),
}));

describe('uploadTempFile', () => {
  beforeEach(() => {
    uploadsControllerUploadTemp.mockReset();
  });

  it('unwraps temp upload payload from API envelope', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    uploadsControllerUploadTemp.mockResolvedValue({
      data: {
        data: {
          tempFileToken: 'tmp-1',
          tempFileId: 'file-1',
          url: '/files/temp/file-1.png',
          fileName: 'avatar.png',
          mimeType: 'image/png',
          sizeBytes: 1234,
        },
        meta: {
          requestId: 'req-1',
          timestamp: '2026-05-07T08:23:06.104Z',
        },
        error: null,
      },
      status: 200,
      headers: new Headers(),
    });

    await expect(
      uploadTempFile({ file, purpose: 'avatar', draftId: '550e8400-e29b-41d4-a716-446655440000' }),
    ).resolves.toEqual({
      tempFileToken: 'tmp-1',
      tempFileId: 'file-1',
      url: '/files/temp/file-1.png',
      fileName: 'avatar.png',
      mimeType: 'image/png',
      sizeBytes: 1234,
    });
  });
});
