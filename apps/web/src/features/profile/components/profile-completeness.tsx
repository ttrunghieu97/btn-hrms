'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProfileSection {
  id: string;
  label: string;
  completed: boolean;
  href?: string;
}

interface ProfileCompletenessProps {
  sections: ProfileSection[];
}

/**
 * Profile completeness indicator.
 * Shows progress + missing items with deep links.
 */
export function ProfileCompleteness({ sections }: ProfileCompletenessProps) {
  const { completed, total, percentage } = useMemo(() => {
    const done = sections.filter((s) => s.completed).length;
    return {
      completed: done,
      total: sections.length,
      percentage: Math.round((done / sections.length) * 100),
    };
  }, [sections]);

  const missing = useMemo(() => sections.filter((s) => !s.completed), [sections]);

  if (percentage >= 100) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile Completeness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Progress value={100} className="h-2 flex-1" />
            <span className="text-sm font-medium text-green-600">100%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">All sections completed</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Profile Completeness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Progress value={percentage} className="h-2 flex-1" />
          <span className="text-sm font-medium">{percentage}%</span>
        </div>
        {missing.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Missing:</p>
            {missing.map((section) => (
              <div key={section.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{section.label}</span>
                {section.href && (
                  <a href={section.href} className="text-xs text-primary hover:underline">
                    Add →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
