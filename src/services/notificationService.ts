import type { NotificationItem } from '../types';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const NOTIFICATION_PAGE_SIZE = 50;

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: 'automation';
  read_at: string | null;
  created_at: string;
};

function toNotificationItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    time: new Date(row.created_at).toLocaleString(),
    read: row.read_at !== null,
    type: row.type,
    linkApp: 'home',
  };
}

export const notificationService = {
  async listForOrganization(organizationId: string, limit = NOTIFICATION_PAGE_SIZE): Promise<NotificationItem[]> {
    if (!organizationId || !isSupabaseConfigured()) return [];
    const pageSize = Math.min(Math.max(Math.floor(limit), 1), NOTIFICATION_PAGE_SIZE);
    const { data, error } = await supabase
      .from('notifications')
      .select('id,title,message,type,read_at,created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(pageSize);
    if (error) throw new Error(error.message || 'Unable to load notifications.');
    return ((data || []) as NotificationRow[]).map(toNotificationItem);
  },

  async getUnreadCount(organizationId: string): Promise<number> {
    if (!organizationId || !isSupabaseConfigured()) return 0;
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('read_at', null);
    if (error) throw new Error(error.message || 'Unable to load unread notification count.');
    return count || 0;
  },

  async markRead(notificationId: string): Promise<void> {
    const { error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
    });
    if (error) throw new Error(error.message || 'Unable to mark notification as read.');
  },

  async markAllRead(organizationId: string): Promise<void> {
    const { error } = await supabase.rpc('mark_all_notifications_read', {
      p_organization_id: organizationId,
    });
    if (error) throw new Error(error.message || 'Unable to mark notifications as read.');
  },
};
