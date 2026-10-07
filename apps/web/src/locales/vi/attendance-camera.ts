export const attendanceCameraCopy = {
  title: 'Chụp ảnh chấm công',
  cameraUnavailable: 'Camera không khả dụng',
  pleaseUpload: 'Hãy tải ảnh lên để tiếp tục',
  live: 'LIVE',
  descriptionWithUpload:
    'Sử dụng camera nếu khả dụng, hoặc tải ảnh selfie từ thiết bị này.',
  descriptionCameraOnly: 'Sử dụng camera để chụp ảnh selfie chấm công.',
  startingCamera: 'Đang khởi động camera...',
  previewUnavailable: 'Không thể hiện xem trước camera.',
  uploadFallback: 'Tải ảnh JPG hoặc PNG để tiếp tục.',
  cameraOnlyFallback: 'Chuyển sang thiết bị có camera hoạt động để tiếp tục.',
  capturedAlt: 'Ảnh đã chụp',
  actions: {
    capture: 'Chụp ảnh',
    upload: 'Tải ảnh',
    retake: 'Chụp lại',
    confirm: 'Xác nhận',
    cancel: 'Hủy',
    retry: 'Thử lại'
  },
  errors: {
    browserUnsupportedWithUpload:
      'Trình duyệt này không hỗ trợ camera. Hãy tải ảnh selfie thay thế.',
    browserUnsupportedCameraOnly:
      'Trình duyệt này không hỗ trợ camera. Hãy dùng thiết bị có camera.',
    notFoundWithUpload:
      'Không tìm thấy camera trên thiết bị này. Hãy tải ảnh selfie để tiếp tục.',
    notFoundCameraOnly:
      'Không tìm thấy camera trên thiết bị này. Hãy dùng thiết bị có camera để tiếp tục.',
    permissionDeniedWithUpload:
      'Quyền truy cập camera đã bị từ chối. Hãy cấp quyền hoặc tải ảnh selfie.',
    permissionDeniedCameraOnly:
      'Quyền truy cập camera đã bị từ chối. Hãy cấp quyền để tiếp tục.',
    cameraBusyWithUpload:
      'Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó hoặc tải ảnh selfie.',
    cameraBusyCameraOnly:
      'Camera đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.',
    genericWithUpload: 'Không thể truy cập camera. Hãy tải ảnh selfie để tiếp tục.',
    genericCameraOnly:
      'Không thể truy cập camera. Hãy thử lại trên thiết bị có camera hoạt động.'
  }
} as const;
