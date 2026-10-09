'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

import { WorkflowStepper, type WorkflowStepperStep } from './workflow-stepper';
import { WorkflowNextActor } from './workflow-next-actor';
import { WorkflowBlockingConditions } from './workflow-blocking-conditions';

export interface WorkflowStep extends WorkflowStepperStep {}

export interface GlobalWorkflowHeroProps {
  title: string;
  badge?: React.ReactNode;
  subtitle?: React.ReactNode;
  steps: WorkflowStep[];
  currentStepIndex: number;
  failedStepIndex?: number;
  nextActor: string;
  actionGuidance: string;
  actionResultPreview?: string;
  blockingConditions?: string[];
  actions?: React.ReactNode;
  className?: string;
}

export function GlobalWorkflowHero({
  title,
  badge,
  subtitle,
  steps,
  currentStepIndex,
  failedStepIndex,
  nextActor,
  actionGuidance,
  actionResultPreview,
  blockingConditions,
  actions,
  className,
}: GlobalWorkflowHeroProps) {
  return (
    <Card className={cn('border-primary/20 bg-card shadow-xs', className)}>
      <CardContent className='p-5 md:p-6 space-y-5'>
        {/* Level 1 & 2: Entity Identity & Status & Level 3 Actions */}
        <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
          <div>
            <div className='flex items-center gap-2.5'>
              <h2 className='text-xl font-bold tracking-tight text-foreground'>
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && (
              <div className='text-xs text-muted-foreground mt-1'>
                {subtitle}
              </div>
            )}
          </div>

          {actions && (
            <div className='flex flex-wrap items-center gap-2'>
              {actions}
            </div>
          )}
        </div>

        {/* Level 3: Stepper Pipeline with Meaning & State */}
        <div className='border-t border-border pt-4'>
          <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3'>
            Tiến trình nghiệp vụ (Workflow Pipeline)
          </p>
          <WorkflowStepper
            steps={steps}
            currentIndex={currentStepIndex}
            failedIndex={failedStepIndex}
          />
        </div>

        {/* Blocking Conditions Alert (if any) */}
        {blockingConditions && blockingConditions.length > 0 && (
          <WorkflowBlockingConditions conditions={blockingConditions} />
        )}

        {/* Level 4 & 5: Responsible Actor & Action Guidance Callout */}
        <WorkflowNextActor
          actor={nextActor}
          guidance={actionGuidance}
          resultPreview={actionResultPreview}
        />
      </CardContent>
    </Card>
  );
}
