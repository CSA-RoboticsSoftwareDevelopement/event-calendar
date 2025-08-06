// components/CustomEvent.tsx
import { CalendarEvent } from '@/src/types/Event';

export function CustomEvent({ event }: { event: CalendarEvent }) {
  const assigned = event.assignments?.map(a => a.user?.name).filter(Boolean).join(', ') || '—';

  return (
    <div>
      <strong>{event.title}</strong>
      <br />
      <small className="text-xs text-gray-600 dark:text-gray-400">
        Assigned to: {assigned}
      </small>
    </div>
  );
}
