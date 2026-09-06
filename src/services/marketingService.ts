import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { EmailCampaign, SMSCampaign, Survey, SocialPost } from '../types';

export const marketingService = {
  async fetchEmailCampaigns(orgId: string): Promise<EmailCampaign[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      senderName: c.sender_name || '',
      senderEmail: c.sender_email || '',
      status: c.status || 'Draft',
      targetSegment: c.target_segment || '',
      recipientCount: c.recipient_count || 0,
      sentCount: c.recipient_count || 0,
      deliveryRate: Number(c.delivery_rate) || 0,
      openRate: Number(c.open_rate) || 0,
      clickRate: Number(c.click_rate) || 0,
      unsubscribeRate: Number(c.unsubscribe_rate) || 0,
    }));
  },

  async createEmailCampaign(
    orgId: string,
    camp: Omit<EmailCampaign, 'id' | 'deliveryRate' | 'openRate' | 'clickRate' | 'unsubscribeRate'>
  ): Promise<EmailCampaign> {
    const id = crypto.randomUUID();
    const fullCamp: EmailCampaign = {
      ...camp,
      id,
      sentCount: camp.recipientCount || 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      unsubscribeRate: 0,
    };

    if (isSupabaseConfigured()) {
      await supabase.from('email_campaigns').insert({
        id,
        organization_id: orgId,
        name: camp.name,
        subject: camp.subject,
        sender_name: camp.senderName,
        sender_email: camp.senderEmail,
        status: camp.status,
        target_segment: camp.targetSegment,
        recipient_count: camp.recipientCount,
        delivery_rate: 0,
        open_rate: 0,
        click_rate: 0,
        unsubscribe_rate: 0,
      });
    }

    return fullCamp;
  },

  async fetchSMSCampaigns(orgId: string): Promise<SMSCampaign[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('sms_campaigns')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map((s) => ({
      id: s.id,
      name: s.name,
      message: s.message,
      status: s.status || 'Draft',
      targetSegment: s.target_audience || '',
      recipientCount: s.recipient_count || 0,
      sentCount: s.recipient_count || 0,
      deliveryRate: Number(s.delivery_rate) || 0,
      clickRate: 0,
    }));
  },

  async createSMSCampaign(orgId: string, sms: Omit<SMSCampaign, 'id' | 'deliveryRate'>): Promise<SMSCampaign> {
    const id = crypto.randomUUID();
    const fullSMS: SMSCampaign = {
      ...sms,
      id,
      sentCount: sms.recipientCount || 0,
      deliveryRate: 0,
      clickRate: 0,
    };

    if (isSupabaseConfigured()) {
      await supabase.from('sms_campaigns').insert({
        id,
        organization_id: orgId,
        name: sms.name,
        message: sms.message,
        target_audience: sms.targetSegment || '',
        recipient_count: sms.recipientCount,
        delivery_rate: 0,
        status: sms.status,
      });
    }

    return fullSMS;
  },

  async fetchSurveys(orgId: string): Promise<Survey[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map((s) => ({
      id: s.id,
      title: s.title,
      category: s.category || 'CSAT',
      status: s.status || 'Active',
      questionsCount: s.questions_count || 0,
      responsesCount: s.responses_count || 0,
      completionRate: Number(s.completion_rate) || 0,
      avgScore: Number(s.avg_score) || 0,
    }));
  },

  async createSurvey(orgId: string, surv: Omit<Survey, 'id' | 'responsesCount' | 'completionRate' | 'avgScore'>): Promise<Survey> {
    const id = crypto.randomUUID();
    const fullSurv: Survey = {
      ...surv,
      id,
      responsesCount: 0,
      completionRate: 0,
      avgScore: 0,
    };

    if (isSupabaseConfigured()) {
      await supabase.from('surveys').insert({
        id,
        organization_id: orgId,
        title: surv.title,
        category: surv.category,
        status: surv.status,
        questions_count: surv.questionsCount,
        responses_count: 0,
        completion_rate: 0,
        avg_score: 0,
      });
    }

    return fullSurv;
  },

  async fetchSocialPosts(orgId: string): Promise<SocialPost[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('social_posts')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map((p) => ({
      id: p.id,
      content: p.content,
      platforms: p.platforms || [],
      status: p.status || 'Draft',
      scheduledFor: p.scheduled_for,
      engagement: {
        likes: p.likes || 0,
        comments: 0,
        shares: p.shares || 0,
        clicks: 0,
      },
    }));
  },

  async createSocialPost(orgId: string, post: Omit<SocialPost, 'id' | 'status' | 'engagement' | 'likes' | 'shares'>): Promise<SocialPost> {
    const id = crypto.randomUUID();
    const fullPost: SocialPost = {
      ...post,
      id,
      status: 'Scheduled',
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        clicks: 0,
      },
    };

    if (isSupabaseConfigured()) {
      await supabase.from('social_posts').insert({
        id,
        organization_id: orgId,
        content: post.content,
        platforms: post.platforms,
        status: 'Scheduled',
        scheduled_for: post.scheduledFor,
      });
    }

    return fullPost;
  },
};
