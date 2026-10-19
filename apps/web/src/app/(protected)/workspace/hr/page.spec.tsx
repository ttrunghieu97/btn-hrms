import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import HrWorkspacePage from './page';
import { useWorkspaceData } from '@/features/workspace';

jest.mock('@/features/workspace', () => {
  const actual = jest.requireActual('@/features/workspace');
  return {
    ...actual,
    useWorkspaceData: jest.fn(),
  };
});

const mockedUseWorkspaceData = useWorkspaceData as jest.MockedFunction<typeof useWorkspaceData>;

describe('HrWorkspacePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeletons when workspace queries are loading', () => {
    mockedUseWorkspaceData.mockReturnValue({
      summary: {
        pendingActionsCount: 0,
        notificationsCount: 0,
      },
      actions: [],
      healthData: undefined,
      complianceData: undefined,
      headerCounts: {
        pendingOnboarding: 0,
        pendingApprovals: 0,
        expiringContracts: 0,
      },
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    const { container } = render(<HrWorkspacePage />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders error state and triggers refetch on retry click', () => {
    const refetch = jest.fn();
    mockedUseWorkspaceData.mockReturnValue({
      summary: {
        pendingActionsCount: 0,
        notificationsCount: 0,
      },
      actions: [],
      healthData: undefined,
      complianceData: undefined,
      headerCounts: {
        pendingOnboarding: 0,
        pendingApprovals: 0,
        expiringContracts: 0,
      },
      isLoading: false,
      error: new Error('Failed to fetch dashboard'),
      refetch,
    });

    render(<HrWorkspacePage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry|thử lại/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders live workforce health, pending actions, and compliance metrics without hardcoded placeholders', () => {
    mockedUseWorkspaceData.mockReturnValue({
      summary: {
        pendingActionsCount: 2,
        notificationsCount: 1,
      },
      actions: [
        {
          id: 'act-1',
          title: 'Approve Leave Request — Nguyen Van A',
          description: 'Annual Leave • 3 days',
          type: 'approval',
          url: '/leave',
          createdAt: '2026-10-19T10:00:00.000Z',
          priority: 'high',
        },
      ],
      healthData: {
        total: 42,
        active: 35,
        probation: 5,
        leaving: 2,
        newThisMonth: 4,
      },
      complianceData: {
        documentsExpiring: 3,
        contractsEnding: 1,
        missingProfiles: 0,
      },
      headerCounts: {
        pendingOnboarding: 2,
        pendingApprovals: 1,
        expiringContracts: 1,
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<HrWorkspacePage />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('+4 this month')).toBeInTheDocument();
    expect(screen.getByText('Approve Leave Request — Nguyen Van A')).toBeInTheDocument();
    expect(screen.queryByText('1248')).not.toBeInTheDocument();
  });
});
