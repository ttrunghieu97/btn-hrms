'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ConfigSection } from './config-section';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'btn-hrms:settings:security';

export function SecurityConfigCard() {
  const [jwtExpiry] = useState('15 min');
  const [refreshToken] = useState('30 days');
  const [rateLimit] = useState('300/min');
  const [cspEnabled, setCspEnabled] = useState(true);
  const [pwUppercase, setPwUppercase] = useState(true);
  const [pwNumbers, setPwNumbers] = useState(true);
  const [pwSymbols, setPwSymbols] = useState(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        cspEnabled?: boolean;
        pwUppercase?: boolean;
        pwNumbers?: boolean;
        pwSymbols?: boolean;
      };
      if (typeof saved.cspEnabled === 'boolean') setCspEnabled(saved.cspEnabled);
      if (typeof saved.pwUppercase === 'boolean') setPwUppercase(saved.pwUppercase);
      if (typeof saved.pwNumbers === 'boolean') setPwNumbers(saved.pwNumbers);
      if (typeof saved.pwSymbols === 'boolean') setPwSymbols(saved.pwSymbols);
    } catch {
      // ignore
    }
  }, []);

  const handleSave = () => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ cspEnabled, pwUppercase, pwNumbers, pwSymbols }),
      );
      toast.success('Đã lưu cấu hình Bảo mật');
    } catch {
      toast.error('Không thể lưu cấu hình Bảo mật');
    }
  };

  return (
    <ConfigSection title="Security" description="Authentication and authorization settings">
      <div className="space-y-4">
        <ConfigRow label="JWT Expiration">
          <Badge variant="secondary" className="font-mono">{jwtExpiry}</Badge>
        </ConfigRow>
        <ConfigRow label="Refresh Token Validity">
          <Badge variant="secondary" className="font-mono">{refreshToken}</Badge>
        </ConfigRow>
        <ConfigRow label="Rate Limiting">
          <Badge variant="secondary" className="font-mono">{rateLimit}</Badge>
        </ConfigRow>
        <ConfigRow label="CSP Report Only">
          <Switch aria-label="CSP Report Only" checked={cspEnabled} onCheckedChange={setCspEnabled} />
        </ConfigRow>
        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium text-muted-foreground">Password Policy</p>
          <ConfigRow label="Require uppercase">
            <Switch aria-label="Require uppercase" checked={pwUppercase} onCheckedChange={setPwUppercase} />
          </ConfigRow>
          <ConfigRow label="Require numbers">
            <Switch aria-label="Require numbers" checked={pwNumbers} onCheckedChange={setPwNumbers} />
          </ConfigRow>
          <ConfigRow label="Require symbols">
            <Switch aria-label="Require symbols" checked={pwSymbols} onCheckedChange={setPwSymbols} />
          </ConfigRow>
        </div>
        <div className="flex justify-end pt-2">
          <Button type="button" size="sm" className="h-8 text-xs" onClick={handleSave}>
            Save Security Settings
          </Button>
        </div>
      </div>
    </ConfigSection>
  );
}

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
