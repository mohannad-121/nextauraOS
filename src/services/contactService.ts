import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Contact } from '../types';

export const contactService = {
  async fetchContacts(orgId: string): Promise<Contact[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ContactService] Fetch contacts error:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type || 'Customer',
      email: row.email || '',
      phone: row.phone || '',
      companyName: row.company_name || row.name,
      company: row.company_name || row.name,
      roles: row.roles || ['Customer'],
      totalBusiness: Number(row.balance) || 0,
      city: 'San Francisco',
      country: 'United States',
    }));
  },

  async createContact(orgId: string, contactData: Omit<Contact, 'id'>): Promise<Contact> {
    const id = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('contacts').insert({
        id,
        organization_id: orgId,
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone,
        company_name: contactData.companyName || contactData.company || contactData.name,
        type: contactData.type || 'Customer',
        roles: contactData.roles || ['Customer'],
        balance: contactData.totalBusiness || 0,
      });

      if (error) {
        console.error('[ContactService] Create contact error:', error);
        throw new Error(`Failed to create contact: ${error.message}`);
      }
    }

    return { ...contactData, id };
  },
};
