import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { AuditLogItem } from '../types';

export const auditService = {
  async logAction(orgId: string, userName: string, action: string, details: string): Promise<AuditLogItem> {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (isSupabaseConfigured()) {
      await supabase.from('audit_logs').insert({
        id,
        organization_id: orgId,
        user_name: userName,
        action,
        details,
        timestamp,
      });
    }

    return {
      id,
      timestamp,
      userName,
      userEmail: 'mohannad@nextaura.ai',
      action,
      module: 'System',
      details,
      ip: '127.0.0.1',
    };
  },
};
