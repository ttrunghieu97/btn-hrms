import { useQuery } from '@tanstack/react-query';
import { fetchMyWorkflowTasks, type WorkflowTaskDomain } from '../api/workflow-tasks';

export function useMyWorkflowTasks(domain: WorkflowTaskDomain = 'all') {
  return useQuery({
    queryKey: ['workflow', 'tasks', 'my', { domain }],
    queryFn: () => fetchMyWorkflowTasks(domain),
    staleTime: 10_000,
  });
}
