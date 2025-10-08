// @/src/types/Event.ts

export interface User {
  nextAvailable: string;
  id: number;
  name: string;
  email: string;
  designation?: string;
}

export interface CalendarEvent {
  status: string;
  isCompleted: any;
  assignments: string ;
  id: number;
  title: string;
  description?: string;
  eventType: 'regular' | 'holiday'; // NEW: Event type field
  start: string | Date;
  end: string | Date;
  assignedTo?: Array<{
    userId: number;
    user?: User;
  }>;
}

export interface EventAssignment {
  id: number;
  userId: number;
  eventId: number;
  user?: User;
}