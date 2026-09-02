import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Candidate, Employee } from '../types';

export const recruitmentService = {
  async fetchCandidates(orgId: string): Promise<Candidate[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('organization_id', orgId);

    if (error) return [];
    return (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone || '+1 415 555 0199',
      location: 'San Francisco, CA',
      appliedPositionId: 'pos-1',
      appliedPositionTitle: c.role_applied || 'Senior Software Engineer',
      department: 'Engineering',
      stage: (c.stage as any) || 'New Applicant',
      source: 'Company Website',
      rating: Number(c.score) || 4,
      appliedDate: c.created_at ? c.created_at.substring(0, 10) : '2026-08-01',
      skills: ['TypeScript', 'React', 'Node.js'],
    }));
  },

  async createCandidate(orgId: string, cand: Omit<Candidate, 'id' | 'stage' | 'rating'>): Promise<Candidate> {
    const id = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      await supabase.from('candidates').insert({
        id,
        organization_id: orgId,
        name: cand.name,
        email: cand.email,
        phone: cand.phone,
        role_applied: cand.appliedPositionTitle,
        stage: 'New Applicant',
        score: 4,
      });
    }
    return { ...cand, id, stage: 'New Applicant', rating: 4 };
  },

  async updateCandidateStage(orgId: string, id: string, stage: Candidate['stage']) {
    if (isSupabaseConfigured()) {
      await supabase
        .from('candidates')
        .update({ stage })
        .eq('id', id)
        .eq('organization_id', orgId);
    }
  },

  async hireCandidate(orgId: string, candidate: Candidate): Promise<Employee> {
    const empId = crypto.randomUUID();
    const empNum = `EMP-${Date.now().toString().slice(-4)}`;

    if (isSupabaseConfigured()) {
      await supabase
        .from('candidates')
        .update({ stage: 'Hired' })
        .eq('id', candidate.id)
        .eq('organization_id', orgId);

      await supabase.from('employees').insert({
        id: empId,
        organization_id: orgId,
        employee_number: empNum,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone || '+1 415 555 0199',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        job_title: candidate.appliedPositionTitle,
        department: candidate.department || 'Engineering',
        work_location: 'San Francisco HQ',
        start_date: new Date().toISOString().substring(0, 10),
        employment_type: 'Full-time',
        status: 'Active',
        base_salary: 12000,
        pay_frequency: 'Monthly',
      });
    }

    return {
      id: empId,
      employeeNumber: empNum,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone || '+1 415 555 0199',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      jobTitle: candidate.appliedPositionTitle,
      department: candidate.department || 'Engineering',
      workLocation: 'San Francisco HQ',
      startDate: new Date().toISOString().substring(0, 10),
      employmentType: 'Full-time',
      status: 'Active',
      baseSalary: 12000,
      payFrequency: 'Monthly',
      skills: [{ name: 'Enterprise SaaS', level: 'Advanced' }],
      onboardingProgress: 100,
    };
  },
};
