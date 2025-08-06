'use client';

import { ReactNode } from 'react';
import { CalendarEvent } from '@/src/types/Event'; // Adjust this import path to your project

interface Props {
  children?: ReactNode;
  value: Date;
  events: CalendarEvent[];
}

export function CustomDateCellWrapper({ children, value, events }: Props) {
  const eventCount = events.filter(
    e => new Date(e.start).toDateString() === value.toDateString()
  ).length;

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {children}
      {eventCount > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 2,
            right: 4,
            fontSize: '0.75rem',
            fontWeight: 'bold',
            color: '#4f46e5', // indigo-600
            cursor: 'pointer',
          }}
        >
          +{eventCount}
        </div>
      )}
    </div>
  );
}
