import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { CalendarEvent } from '../types';

export const calendarService = {
  async fetchEvents(orgId: string): Promise<CalendarEvent[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('organization_id', orgId);

    if (error) return [];
    return (data || []).map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      type: e.type,
      module: e.module,
      color: e.color,
    }));
  },

  async createEvent(orgId: string, event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const id = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      await supabase.from('calendar_events').insert({
        id,
        organization_id: orgId,
        title: event.title,
        date: event.date,
        time: event.time,
        type: event.type,
        module: event.module,
        color: event.color,
      });
    }
    return { ...event, id };
  },
};
