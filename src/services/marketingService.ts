import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { EmailCampaign, SMSCampaign, Survey, SocialPost } from '../types';

export const marketingService = {
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
