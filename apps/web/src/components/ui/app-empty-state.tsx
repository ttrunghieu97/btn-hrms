'use client';

import { EmptyState, type EmptyStateProps } from '@/components/states/empty-state';

export type AppEmptyStateProps = EmptyStateProps;

/**
 * AppEmptyState — legacy alias pointing to the canonical EmptyState component.
 * Retained for backward compatibility with existing feature imports.
 */
export const AppEmptyState = EmptyState;
