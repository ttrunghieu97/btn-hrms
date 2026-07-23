'use client';

import { useState } from 'react';
import { ConfigSection } from './config-section';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function SecurityConfigCard() {
  const [jwtExpiry] = useState('15 min');
  const [refreshToken] = useState('30 days');
  const [rateLimit] = useState('300/min');
  const [cspEnabled, setCspEnabled] = useState(true);
  const [pwUppercase, setPwUppercase] = useState(true);
  const [pwNumbers, setPwNumbers] = useState(true);
  const [pwSymbols, setPwSymbols] = useState(true);

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
          <Switch checked={cspEnabled} onCheckedChange={setCspEnabled} />
        </ConfigRow>
        <div className="space-y-2 pt-2">
          <p className="text-xs font-medium text-muted-foreground">Password Policy</p>
          <ConfigRow label="Require uppercase">
            <Switch checked={pwUppercase} onCheckedChange={setPwUppercase} />
          </ConfigRow>
          <ConfigRow label="Require numbers">
            <Switch checked={pwNumbers} onCheckedChange={setPwNumbers} />
          </ConfigRow>
          <ConfigRow label="Require symbols">
            <Switch checked={pwSymbols} onCheckedChange={setPwSymbols} />
          </ConfigRow>
        </div>
        <div className="flex justify-end pt-2">
          <Button size="sm" className="h-8 text-xs">Save Security Settings</Button>
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
