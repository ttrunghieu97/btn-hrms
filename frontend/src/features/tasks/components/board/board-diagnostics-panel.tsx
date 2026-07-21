'use client';

/**
 * Dev-only diagnostics panel for the task board.
 *
 * Shows board health, state distribution, and invariant issues.
 * Only renders when NEXT_PUBLIC_DEBUG is 'true'.
 */

import { Icons } from '@/components/icons';
import type { BoardDiagnostics } from './board-validation';
import { kanbanUiCopy } from '@/locales/vi/kanban';

export function BoardDiagnosticsPanel({ diagnostics }: { diagnostics: BoardDiagnostics | null }) {
  if (process.env.NEXT_PUBLIC_DEBUG !== 'true' || !diagnostics) return null;

  return (
    <details className='group rounded-lg border border-dashed p-3 text-xs'>
      <summary className='text-muted-foreground flex cursor-pointer items-center gap-2 font-mono text-xs hover:text-foreground'>
        <Icons.activity className='h-3 w-3' />
        {kanbanUiCopy.diagnostics.panelTitle}
        {diagnostics.healthy ? (
          <span className='text-emerald-500'>{kanbanUiCopy.diagnostics.healthy}</span>
        ) : (
          <span className='text-red-500'>{diagnostics.issues.length} {kanbanUiCopy.diagnostics.issues}</span>
        )}
      </summary>
      <div className='mt-2 space-y-2'>
        <div className='text-muted-foreground'>{kanbanUiCopy.diagnostics.tasksSummary(diagnostics.totalTasks, Object.keys(diagnostics.stateDistribution).length)}</div>

        {/* State distribution */}
        <div className='grid grid-cols-4 gap-1'>
          {Object.entries(diagnostics.stateDistribution).map(([state, count]) => (
            <div key={state} className='rounded bg-muted/50 px-2 py-1 font-mono'>
              <div className='text-foreground'>{count}</div>
              <div className='text-muted-foreground truncate'>{state}</div>
            </div>
          ))}
        </div>

        {/* Issues */}
        {diagnostics.issues.length > 0 && (
          <div className='space-y-1'>
            <div className='text-foreground font-medium'>{kanbanUiCopy.diagnostics.issuesHeader}</div>
            {diagnostics.issues.map((issue, i) => (
              <div
                key={i}
                className={`rounded px-2 py-1 font-mono ${
                  issue.severity === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                }`}
              >
                <span className='font-semibold'>[{issue.severity}]</span>{' '}
                {issue.message}
                {issue.taskId && <span className='opacity-60'> ({kanbanUiCopy.diagnostics.taskLabel}: {issue.taskId.slice(0, 8)})</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
