// components/AgendaView.tsx
import { CalendarEvent } from '@/src/types/Event';

export const CustomAgendaEvent = ({ event }: { event: CalendarEvent }) => {
  console.log('Agenda Event:', event); // <-- Check this in browser console
  return (
    <div>
      <strong>{event.title}</strong>
      <br />
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Assigned to:{' '}
        {event.assignedTo?.map(u => u.user?.name || '').join(', ') || '—'}
      </span>
    </div>
  );
};

