'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  permissions?: string[];
}

export interface QuickActionCardProps {
  title: string;
  actions: QuickAction[];
  className?: string;
}

export function QuickActionCard({ title, actions, className }: QuickActionCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <h3 className="text-sm font-medium mb-3">{title}</h3>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const content = (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto flex-col items-start gap-1 p-3 text-left"
                onClick={action.onClick}
                asChild={!!action.href}
              >
                {action.href ? <Link href={action.href}>{renderActionContent(action)}</Link> : renderActionContent(action)}
              </Button>
            );
            return content;
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function renderActionContent(action: QuickAction) {
  return (
    <>
      {action.icon && <span className="text-muted-foreground">{action.icon}</span>}
      <span className="text-sm font-medium">{action.label}</span>
      {action.description && (
        <span className="text-xs text-muted-foreground font-normal">{action.description}</span>
      )}
    </>
  );
}
