'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useState } from 'react';

interface GoogleSsoButtonProps {
  onSuccess: (idToken: string) => Promise<void>;
  label?: string;
  variant?: 'login' | 'link';
}

// Google Identity Services types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: { theme?: string; size?: string; shape?: string; text?: string }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export function GoogleSsoButton({ onSuccess, label, variant = 'login' }: GoogleSsoButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID not configured');
      return;
    }

    setLoading(true);
    try {
      // Load GIS script dynamically
      if (!document.querySelector('#google-gis-script')) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.id = 'google-gis-script';
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
          document.head.appendChild(script);
        });
      }

      // Wait for google lib to be ready
      await new Promise<void>((resolve) => {
        const check = () => {
          if (window.google?.accounts?.id) resolve();
          else setTimeout(check, 100);
        };
        check();
      });

      window.google!.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            await onSuccess(response.credential);
          } finally {
            setLoading(false);
          }
        },
        auto_select: variant === 'login',
      });

      if (variant === 'link') {
        // For linking, just prompt the user to select account
        window.google!.accounts.id.prompt();
      }
    } catch (err) {
      console.error('Google SSO error:', err);
      setLoading(false);
    }
  };

  const defaultLabel = variant === 'link' ? 'Liên kết tài khoản Google' : 'Đăng nhập bằng Google';

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleGoogleLogin}
      disabled={loading || !GOOGLE_CLIENT_ID}
    >
      {loading ? (
        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Icons.google className="mr-2 h-4 w-4" />
      )}
      {label || defaultLabel}
    </Button>
  );
}
