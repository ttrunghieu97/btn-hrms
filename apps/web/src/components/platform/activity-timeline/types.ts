export type TimelineItemStatus = 'completed' | 'pending' | 'rejected' | 'cancelled' | 'skipped';

export interface TimelineActor {
  id: string;
  name: string;
  avatar?: string | null;
  role?: string;
}

export interface TimelineMetadata {
  label: string;
  value: string;
}

export interface TimelineItem {
  id: string;
  type: 'approval' | 'status_change' | 'comment' | 'system' | 'document';
  title: string;
  description?: string;
  status: TimelineItemStatus;
  timestamp: string | Date;
  actor?: TimelineActor;
  metadata?: TimelineMetadata[];
}
