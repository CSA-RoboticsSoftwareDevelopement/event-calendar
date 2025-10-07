// components/CustomEvent.tsx
import { CalendarEvent } from '@/src/types/Event';

export function CustomEvent({ event }: { event: CalendarEvent }) {
  const assigned =
  Array.isArray(event.assignments)
    ? event.assignments
        .map((a) => a.user?.name)
        .filter((name): name is string => Boolean(name))
        .join(', ')
    : '—';


  return (
    <div>
      <strong>{event.title}</strong>
      <br />
      <small className="text-xs text-gray-600">
        Assigned to: {assigned}
      </small>
    </div>
  );
}

