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
      senderName: c.sender_name || 'NextAura Team',
      senderEmail: c.sender_email || 'marketing@nextaura.ai',
      status: c.status || 'Scheduled',
      targetSegment: c.target_segment || 'All Subscribers',
      recipientCount: c.recipient_count || 1000,
      sentCount: c.recipient_count || 1000,
      deliveryRate: Number(c.delivery_rate) || 99.5,
      openRate: Number(c.open_rate) || 42.0,
      clickRate: Number(c.click_rate) || 18.0,
      unsubscribeRate: Number(c.unsubscribe_rate) || 0.1,
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
      sentCount: camp.recipientCount || 24500,
      deliveryRate: 99.8,
      openRate: 42.5,
      clickRate: 18.6,
      unsubscribeRate: 0.1,
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
        delivery_rate: fullCamp.deliveryRate,
        open_rate: fullCamp.openRate,
        click_rate: fullCamp.clickRate,
        unsubscribe_rate: fullCamp.unsubscribeRate,
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
      status: s.status || 'Scheduled',
      targetSegment: s.target_audience || 'VIP Clients',
      recipientCount: s.recipient_count || 500,
      sentCount: s.recipient_count || 500,
      deliveryRate: Number(s.delivery_rate) || 98.9,
      clickRate: 14.2,
    }));
  },

  async createSMSCampaign(orgId: string, sms: Omit<SMSCampaign, 'id' | 'deliveryRate'>): Promise<SMSCampaign> {
    const id = crypto.randomUUID();
    const fullSMS: SMSCampaign = {
      ...sms,
      id,
      sentCount: sms.recipientCount || 4200,
      deliveryRate: 99.1,
      clickRate: 14.2,
    };

    if (isSupabaseConfigured()) {
      await supabase.from('sms_campaigns').insert({
        id,
        organization_id: orgId,
        name: sms.name,
        message: sms.message,
        target_audience: sms.targetSegment || 'VIP Clients',
        recipient_count: sms.recipientCount,
        delivery_rate: 99.1,
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
      questionsCount: s.questions_count || 4,
      responsesCount: s.responses_count || 0,
      completionRate: Number(s.completion_rate) || 100,
      avgScore: Number(s.avg_score) || 5.0,
    }));
  },

  async createSurvey(orgId: string, surv: Omit<Survey, 'id' | 'responsesCount' | 'completionRate' | 'avgScore'>): Promise<Survey> {
    const id = crypto.randomUUID();
    const fullSurv: Survey = {
      ...surv,
      id,
      responsesCount: 0,
      completionRate: 100,
      avgScore: 5.0,
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
        completion_rate: 100,
        avg_score: 5.0,
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
      platforms: p.platforms || ['LinkedIn'],
      status: p.status || 'Scheduled',
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
