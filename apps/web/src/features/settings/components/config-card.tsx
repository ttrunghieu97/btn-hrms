'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

interface ConfigField {
  label: string;
  value: string | boolean | number;
  type?: 'text' | 'boolean' | 'number';
  onChange?: (value: string | boolean) => void;
}

interface ConfigCardProps {
  title: string;
  fields: ConfigField[];
  actions?: ReactNode;
  onSave?: () => void;
}

export function ConfigCard({ title, fields, actions, onSave }: ConfigCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => (
          <div key={field.label} className="flex items-center justify-between">
            <span className="text-sm">{field.label}</span>
            {field.type === 'boolean' ? (
              <Switch
                checked={field.value as boolean}
                onCheckedChange={(checked) => field.onChange?.(checked)}
              />
            ) : (
              <Badge variant="secondary" className="font-mono text-xs">
                {String(field.value)}
              </Badge>
            )}
          </div>
        ))}
        {actions}
        {onSave && (
          <div className="flex justify-end pt-2">
            <Button size="sm" className="h-8 text-xs" onClick={onSave}>Save</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
