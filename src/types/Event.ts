export interface CalendarEvent {
  id: number;
  title: string;
  start: string | Date;
  end: string | Date;
  assignedTo: { userId: number; user: { id: number; name: string } }[];
}

export interface User {
  id: number;
  name: string;
}
export interface CalendarEvent {
  id: number;
  title: string;
  start: Date | string;
  end: Date | string;
  assignments?: {
    userId: number;
    user: {
      id: number;
      name: string;
    } | null;
  }[];
}
