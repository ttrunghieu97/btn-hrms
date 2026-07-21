import { useState, useEffect, useCallback } from 'react';

export function useGPSLocation() {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Định vị GPS không được hỗ trợ bởi trình duyệt.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setPermissionStatus('granted');
        setError(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionStatus('denied');
          setError('Quyền truy cập vị trí bị từ chối.');
        } else {
          setError('Không thể lấy tọa độ vị trí.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    // Check permission status if API is available
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        setPermissionStatus(status.state as 'prompt' | 'granted' | 'denied');
        status.onchange = () => {
          setPermissionStatus(status.state as 'prompt' | 'granted' | 'denied');
        };
      });
    }

    requestLocation();
  }, [requestLocation]);

  return { coords, permissionStatus, error, refetchLocation: requestLocation };
}
