import { useState, useMemo } from 'react';
import { useAttendanceQueryControllerGetTodayAttendance } from '@/api/generated/endpoints';
import { unwrapData } from '@/lib/api-extract';
import { useGPSLocation } from './useGPSLocation';
import type { TodayAttendanceResponseDto } from '@/api/generated/model';

/** The generated `TodayAttendanceResponseDto` is missing `todaySessions` from the API.
    Extend it locally to match the actual response shape. */
type TodayAttendanceApiData = TodayAttendanceResponseDto & {
  todaySessions: SessionView[];
};

export type SessionView = {
  id: string;
  type: 'MORNING' | 'AFTERNOON' | 'LUNCH_DUTY' | 'NIGHT' | 'OT';
  status: 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  canCheckIn: boolean;
  canCheckOut: boolean;
  warnings: string[];
};

export enum AttendanceState {
  INITIALIZING = 'INITIALIZING',
  NO_SHIFT = 'NO_SHIFT',
  READY = 'READY',
  WORKING = 'WORKING',
  COMPLETED = 'COMPLETED',
}

export enum AttendanceUIState {
  DEFAULT = 'DEFAULT',
  CAMERA_CAPTURE = 'CAMERA_CAPTURE',
  PHOTO_PREVIEW = 'PHOTO_PREVIEW',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
}

export function useAttendanceHome() {
  const [uiState, setUiState] = useState<AttendanceUIState>(AttendanceUIState.DEFAULT);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [punchError, setPunchError] = useState<string | null>(null);

  const { data: todayData, isLoading, error: apiError, refetch } = useAttendanceQueryControllerGetTodayAttendance({
    query: {
      select: (res) => unwrapData<TodayAttendanceApiData>(res),
    },
  });

  const { coords, permissionStatus: gpsPermission, error: gpsError, refetchLocation } = useGPSLocation();

  // Derive sessions from the new API
  const sessions: SessionView[] = useMemo(() => {
    return todayData?.todaySessions ?? [];
  }, [todayData]);

  // Business state derived from sessions
  const businessState = useMemo((): AttendanceState => {
    if (isLoading) return AttendanceState.INITIALIZING;
    if (!todayData) return AttendanceState.INITIALIZING;

    const hasActive = sessions.some((s) => s.status === 'IN_PROGRESS');
    if (hasActive || todayData?.canCheckOut === true) {
      return AttendanceState.WORKING;
    }

    const hasShift = todayData?.shift != null;
    const canCheckIn = todayData?.canCheckIn === true;

    if (canCheckIn) {
      return hasShift ? AttendanceState.READY : AttendanceState.NO_SHIFT;
    }

    // Cannot check in and cannot check out
    const hasAnySession = sessions.length > 0;
    if (hasAnySession) {
      return AttendanceState.COMPLETED;
    }

    return hasShift ? AttendanceState.READY : AttendanceState.NO_SHIFT;
  }, [todayData, sessions, isLoading]);

  // The next actionable session (first READY or IN_PROGRESS)
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.status === 'IN_PROGRESS' || s.status === 'READY') ?? null;
  }, [sessions]);

  // GPS validation
  const isGpsValid = useMemo(() => {
    const geo = todayData?.geofence;
    if (!geo || !geo.latitude || !geo.longitude || !geo.radiusMeters) return true;
    if (!coords) return false;
    const { latitude, longitude, radiusMeters } = geo;
    const R = 6371e3;
    const f1 = (coords.latitude * Math.PI) / 180;
    const f2 = (Number(latitude) * Math.PI) / 180;
    const dLat = ((Number(latitude) - coords.latitude) * Math.PI) / 180;
    const dLon = ((Number(longitude) - coords.longitude) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dLon / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return distance <= radiusMeters;
  }, [coords, todayData]);

  const canCheckIn = todayData?.canCheckIn === true && isGpsValid;
  const canCheckOut = todayData?.canCheckOut === true;

  return {
    state: businessState,
    uiState, setUiState,
    sessions,
    activeSession,
    shift: todayData?.shift ?? null,
    checkIn: todayData?.checkIn ?? null,
    checkOut: todayData?.checkOut ?? null,
    geofence: todayData?.geofence ?? null,
    workingDurationSeconds: todayData?.workingDurationSeconds ?? 0,
    warnings: todayData?.warnings ?? [],
    gpsPermission, gpsError, isGpsValid,
    canCheckIn, canCheckOut,
    capturedFile, setCapturedFile,
    punchError, setPunchError,
    refetchData: refetch,
    refetchLocation,
    error: apiError,
  };
}
