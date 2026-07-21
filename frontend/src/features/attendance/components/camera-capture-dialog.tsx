'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Icons } from '@/components/icons';
import { attendanceCameraCopy } from '@/locales/vi/attendance-camera';
import { cn } from '@/lib/utils';
import { envClient } from '@/lib/env.client';

export type AttendanceImageSource = 'camera' | 'upload';

interface CameraCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File, source: AttendanceImageSource) => void;
}

// ── constants ──────────────────────────────────────────────────────────
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_DIMENSION = 4096;

// ── helpers ────────────────────────────────────────────────────────────
function validateImageFile(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number]))
    return { ok: false as const, reason: 'Chỉ chấp nhận JPEG/PNG.' };
  if (file.size > MAX_FILE_SIZE)
    return { ok: false as const, reason: 'File quá lớn, giới hạn 5 MB.' };
  return { ok: true as const };
}

// ── Motion variants ────────────────────────────────────────────────────
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 320, damping: 28, mass: 0.9 },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: 20,
    transition: { duration: 0.18, ease: 'easeIn' },
  },
};

const scanLineKeyframes = {
  animate: {
    y: ['-100%', '100%'],
    transition: { duration: 2.2, repeat: Infinity, ease: 'linear' },
  },
};

// ── Viewfinder corners SVG ─────────────────────────────────────────────
function ViewfinderCorners({ className }: { className?: string }) {
  return (
    <svg
      className={cn('pointer-events-none absolute inset-0 size-full', className)}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top-left */}
      <path d="M4 22V4h18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Top-right */}
      <path d="M78 4h18v18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom-right */}
      <path d="M96 78v18H78" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom-left */}
      <path d="M22 96H4V78" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Shutter button ─────────────────────────────────────────────────────
function ShutterButton({
  onClick,
  disabled,
  recording,
}: {
  onClick: () => void;
  disabled: boolean;
  recording: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative flex items-center justify-center size-16 rounded-full transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-black/80',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-pointer hover:scale-105 active:scale-95',
      )}
    >
      {/* Outer glow ring */}
      <span className="absolute inset-0 rounded-full bg-white/5 ring-2 ring-white/30 ring-offset-4 ring-offset-black/50" />
      {/* Inner button */}
      <span
        className={cn(
          'size-12 rounded-full border-[3px] transition-all duration-200',
          recording
            ? 'border-white bg-white'
            : 'border-white/80 bg-white/90 group-hover:bg-white group-active:bg-white/70',
        )}
      />
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────
export function CameraCaptureDialog({
  open,
  onOpenChange,
  onCapture,
}: CameraCaptureDialogProps) {
  const allowImageUpload = envClient.attendanceAllowImageUpload;

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Camera state
  const [cameraStatus, setCameraStatus] = useState<
    'idle' | 'starting' | 'ready' | 'error'
  >('idle');
  const [cameraErrorTitle, setCameraErrorTitle] = useState<string | null>(null);

  // Capture state
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingSource, setPendingSource] =
    useState<AttendanceImageSource | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isConfirming, startConfirmTransition] = useTransition();

  // ── Camera lifecycle ────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraStatus('idle');
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraErrorTitle(null);
    setValidationError(null);

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setCameraStatus('error');
      setCameraErrorTitle('Kết nối không bảo mật (HTTP). Camera yêu cầu kết nối bảo mật (HTTPS) để hoạt động.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setCameraErrorTitle('Trình duyệt không hỗ trợ camera');
      return;
    }

    setCameraStatus('starting');
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = ms;
      setCameraStatus('ready');
      if (videoRef.current) void videoRef.current.play();
    } catch (err: any) {
      setCameraStatus('error');
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraErrorTitle('Quyền truy cập camera bị từ chối. Vui lòng kiểm tra quyền cài đặt trên trình duyệt.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraErrorTitle('Không tìm thấy thiết bị camera.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setCameraErrorTitle('Camera đang bị ứng dụng hoặc tab khác chiếm giữ.');
        } else {
          setCameraErrorTitle(`Không thể truy cập camera (${err.name})`);
        }
      } else {
        setCameraErrorTitle('Không thể truy cập camera');
      }
    }
  }, [stopCamera]);

  useEffect(() => {
    if (open) {
      setCapturedPreview(null);
      setPendingFile(null);
      setPendingSource(null);
      setValidationError(null);
      setCameraErrorTitle(null);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      void startCamera();
    } else {
      stopCamera();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
      setCapturedPreview(null);
      setPendingFile(null);
      setPendingSource(null);
      setValidationError(null);
      setCameraErrorTitle(null);
    }
    return () => {
      stopCamera();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Bind stream to video element once it is mounted
  useEffect(() => {
    if (cameraStatus === 'ready' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraStatus]);

  // ── Capture ─────────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPreview(dataUrl);
    setPendingSource('camera');
    setPendingFile(null);
    stopCamera();
  }, [stopCamera]);

  // ── File upload ─────────────────────────────────────────────────────
  const triggerFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const validation = validateImageFile(file);
      if (!validation.ok) {
        setValidationError(validation.reason);
        return;
      }
      setValidationError(null);
      setPendingFile(file);
      setPendingSource('upload');
      stopCamera();

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;

      const img = new Image();
      img.onload = () => {
        if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
          setValidationError(`Kích thước quá lớn (tối đa ${MAX_DIMENSION}px).`);
          setPendingFile(null);
          setPendingSource(null);
          setCapturedPreview(null);
          URL.revokeObjectURL(url);
          objectUrlRef.current = null;
          return;
        }
        setCapturedPreview(url);
      };
      img.onerror = () => {
        setValidationError('Không thể đọc file ảnh.');
        setPendingFile(null);
        setPendingSource(null);
        URL.revokeObjectURL(url);
        objectUrlRef.current = null;
      };
      img.src = url;
    },
    [stopCamera],
  );

  // ── Confirm / Retake ────────────────────────────────────────────────
  const confirmCapture = useCallback(() => {
    if (isConfirming) return;
    if (pendingFile && pendingSource) {
      startConfirmTransition(() => {
        onCapture(pendingFile, pendingSource);
        onOpenChange(false);
      });
      return;
    }
    if (capturedPreview && canvasRef.current && pendingSource === 'camera') {
      canvasRef.current.toBlob(
        blob => {
          if (!blob) return;
          onCapture(new File([blob], 'attendance-capture.jpg', { type: 'image/jpeg' }), 'camera');
          onOpenChange(false);
        },
        'image/jpeg',
        0.85,
      );
    }
  }, [isConfirming, pendingFile, pendingSource, capturedPreview, onCapture, onOpenChange]);

  const retake = useCallback(() => {
    setCapturedPreview(null);
    setPendingFile(null);
    setPendingSource(null);
    setValidationError(null);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    if (open) void startCamera();
  }, [open, startCamera]);

  const isReady = cameraStatus === 'ready';
  const hasError = cameraStatus === 'error';
  const isStarting = cameraStatus === 'starting';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ── Custom animated overlay ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl"
            >
              <VisuallyHidden>
                <DialogTitle>{attendanceCameraCopy.title}</DialogTitle>
                <DialogDescription>
                  {allowImageUpload
                    ? attendanceCameraCopy.descriptionWithUpload
                    : attendanceCameraCopy.descriptionCameraOnly}
                </DialogDescription>
              </VisuallyHidden>

              {/* ── Viewport ────────────────────────────────────────── */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                {/* Video / Preview / Placeholder */}
                {capturedPreview ? (
                  <img
                    src={capturedPreview}
                    alt={attendanceCameraCopy.capturedAlt}
                    className="size-full object-contain"
                  />
                ) : hasError ? (
                  <div className="flex size-full flex-col items-center justify-center gap-3 bg-zinc-900 px-6 text-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                      <Icons.camera className="size-5" />
                    </span>
                    <p className="text-sm font-medium text-zinc-300">
                      {cameraErrorTitle ?? 'Lỗi camera'}
                    </p>
                    {allowImageUpload && (
                      <p className="text-xs text-zinc-500">{attendanceCameraCopy.pleaseUpload}</p>
                    )}
                  </div>
                ) : isStarting ? (
                  <div className="flex size-full flex-col items-center justify-center gap-3 bg-zinc-900">
                    <span className="size-8 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
                    <p className="text-xs text-zinc-500">{attendanceCameraCopy.startingCamera}</p>
                  </div>
                ) : cameraStatus === 'idle' ? (
                  <div className="flex size-full flex-col items-center justify-center gap-3 bg-zinc-900">
                    <Icons.camera className="size-7 text-zinc-600" />
                    <p className="text-xs text-zinc-500">{attendanceCameraCopy.cameraUnavailable}</p>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="size-full object-cover"
                    />
                    {/* Scan line overlay (only when live) */}
                    <motion.div
                      className="pointer-events-none absolute inset-0"
                      variants={scanLineKeyframes}
                      animate="animate"
                    >
                      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/35 to-transparent shadow-[0_0_6px_rgba(255,255,255,0.15)]" />
                    </motion.div>
                    {/* Red recording dot */}
                    <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm">
                      <span className="size-1.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]" />
                      {attendanceCameraCopy.live}
                    </span>
                  </>
                )}

                {/* Viewfinder corners (always shown) */}
                <ViewfinderCorners className="text-white/60 [&>path]:drop-shadow-[0_0_3px_rgba(0,0,0,0.5)]" />

                <canvas ref={canvasRef} className="hidden" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Close button (top-right) */}
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={isConfirming}
                  className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-black/40 text-white/60 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white/90"
                >
                  <Icons.close className="size-4" />
                </button>
              </div>

              {/* ── Validation error ──────────────────────────────────── */}
              <AnimatePresence>
                {validationError && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex items-center gap-1.5 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400"
                  >
                    <Icons.warning className="size-3.5 shrink-0" />
                    {validationError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* ── Controls ─────────────────────────────────────────── */}
              <div className="bg-zinc-950 px-4 py-4">
                <AnimatePresence mode="wait">
                  {/* Preview state */}
                  {capturedPreview ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center justify-center gap-3"
                    >
                      <Button
                        onClick={retake}
                        disabled={isConfirming}
                        variant="ghost"
                        className="text-zinc-400 hover:bg-white/5 hover:text-white"
                      >
                        <Icons.refresh className="mr-1.5 size-4" />
                        {attendanceCameraCopy.actions.retake}
                      </Button>
                      <Button
                        onClick={confirmCapture}
                        disabled={isConfirming}
                        className="min-w-[120px] bg-white text-zinc-950 shadow-lg shadow-white/10 hover:bg-zinc-200"
                      >
                        {isConfirming ? (
                          <span className="size-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                        ) : (
                          <Icons.check className="mr-1.5 size-4" />
                        )}
                        {attendanceCameraCopy.actions.confirm}
                      </Button>
                    </motion.div>
                  ) : // Error state
                  hasError ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <Button
                        onClick={startCamera}
                        variant="ghost"
                        className="text-zinc-400 hover:bg-white/5 hover:text-white"
                      >
                        <Icons.refresh className="mr-1.5 size-4" />
                        {attendanceCameraCopy.actions.retry}
                      </Button>
                      {allowImageUpload && (
                        <Button
                          onClick={triggerFilePicker}
                          variant="outline"
                          className="border-zinc-700 text-zinc-300 hover:bg-white/5 hover:text-white"
                        >
                          <Icons.upload className="mr-1.5 size-4" />
                          {attendanceCameraCopy.actions.upload}
                        </Button>
                      )}
                      <Button
                        onClick={() => onOpenChange(false)}
                        variant="ghost"
                        className="text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                      >
                        {attendanceCameraCopy.actions.cancel}
                      </Button>
                    </motion.div>
                  ) : (
                    // Live / idle camera state
                    <motion.div
                      key="live"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <ShutterButton
                        onClick={capturePhoto}
                        disabled={!isReady || isConfirming}
                        recording={isReady}
                      />
                      <div className="flex items-center gap-2">
                        {allowImageUpload && (
                          <Button
                            onClick={triggerFilePicker}
                            disabled={isConfirming}
                            variant="ghost"
                            className="h-7 px-2 text-[11px] text-zinc-500 hover:text-zinc-300"
                          >
                            <Icons.upload className="mr-1 size-3.5" />
                            {attendanceCameraCopy.actions.upload}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
