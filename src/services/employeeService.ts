import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Employee, Department, Vehicle, VehicleMaintenance, AttendanceRecord, TimeOffRequest, Appraisal } from '../types';

const avatarSignedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export const employeeService = {
  // Departments
  async fetchDepartments(orgId: string): Promise<Department[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('organization_id', orgId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching departments from Supabase:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description || '',
      managerEmployeeId: row.manager_employee_id,
      managerName: row.manager_name || '',
      employeeCount: row.employee_count || 0,
      openPositions: 0,
      monthlyPayrollCost: Number(row.budget) || 0,
      createdAt: row.created_at,
    }));
  },

  async createDepartment(
    orgId: string,
    dept: { name: string; description?: string; managerEmployeeId?: string; managerName?: string }
  ): Promise<Department> {
    const id = crypto.randomUUID();
    const code = dept.name.substring(0, 3).toUpperCase();

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('departments').insert({
        id,
        organization_id: orgId,
        name: dept.name.trim(),
        code,
        description: dept.description?.trim() || null,
        manager_employee_id: dept.managerEmployeeId || null,
        manager_name: dept.managerName || null,
      });

      if (error) {
        console.error('Error creating department in Supabase:', error);
        throw new Error(`Failed to create department: ${error.message}`);
      }
    }

    return {
      id,
      name: dept.name.trim(),
      code,
      description: dept.description?.trim() || '',
      managerEmployeeId: dept.managerEmployeeId,
      managerName: dept.managerName || '',
      employeeCount: 0,
      openPositions: 0,
      monthlyPayrollCost: 0,
    };
  },

  // Avatar Storage
  async uploadEmployeeAvatar(orgId: string, employeeId: string, file: File): Promise<string> {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      throw new Error('Please upload a JPG, PNG, or WebP image up to 5 MB.');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Please upload a JPG, PNG, or WebP image up to 5 MB.');
    }

    if (!isSupabaseConfigured()) {
      return URL.createObjectURL(file);
    }

    const cleanFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storagePath = `${orgId}/${employeeId}/${cleanFileName}`;

    const { data, error } = await supabase.storage
      .from('employee-avatars')
      .upload(storagePath, file, { upsert: true });

    if (error) {
      console.error('Error uploading avatar to Supabase Storage:', error);
      throw new Error(`Avatar upload failed: ${error.message}`);
    }

    return data.path;
  },

  async deleteEmployeeAvatar(path: string): Promise<void> {
    if (!path || !isSupabaseConfigured() || path.startsWith('http') || path.startsWith('blob:')) return;
    try {
      await supabase.storage.from('employee-avatars').remove([path]);
      avatarSignedUrlCache.delete(path);
    } catch (e) {
      console.error('Error deleting avatar from storage:', e);
    }
  },

  async getEmployeeAvatarUrl(avatarPathOrUrl?: string): Promise<string> {
    if (!avatarPathOrUrl) return '';
    if (
      avatarPathOrUrl.startsWith('http://') ||
      avatarPathOrUrl.startsWith('https://') ||
      avatarPathOrUrl.startsWith('blob:') ||
      avatarPathOrUrl.startsWith('data:')
    ) {
      return avatarPathOrUrl;
    }

    if (!isSupabaseConfigured()) return '';

    const cached = avatarSignedUrlCache.get(avatarPathOrUrl);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    try {
      const { data, error } = await supabase.storage
        .from('employee-avatars')
        .createSignedUrl(avatarPathOrUrl, 3600);

      if (error || !data?.signedUrl) {
        const { data: pubData } = supabase.storage.from('employee-avatars').getPublicUrl(avatarPathOrUrl);
        return pubData.publicUrl || '';
      }

      avatarSignedUrlCache.set(avatarPathOrUrl, {
        url: data.signedUrl,
        expiresAt: Date.now() + 50 * 60 * 1000,
      });

      return data.signedUrl;
    } catch (err) {
      console.error('Error creating signed avatar URL:', err);
      return '';
    }
  },

  // Employees
  async fetchEmployees(orgId: string): Promise<Employee[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching employees from Supabase:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      employeeNumber: row.employee_number,
      name: row.name,
      email: row.email,
      phone: row.phone || '',
      avatar: row.avatar || '',
      jobTitle: row.job_title,
      department: row.department,
      workLocation: row.work_location,
      startDate: row.start_date,
      employmentType: row.employment_type,
      status: row.status,
      baseSalary: Number(row.base_salary) || 0,
      payFrequency: row.pay_frequency || 'Monthly',
      managerName: row.manager_name || '',
      skills: row.skills || [],
      onboardingProgress: 100,
    }));
  },

  async createEmployee(orgId: string, emp: Omit<Employee, 'id' | 'employeeNumber' | 'onboardingProgress'>): Promise<Employee> {
    const id = crypto.randomUUID();
    const empNum = `EMP-${Date.now().toString().slice(-4)}`;

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('employees').insert({
        id,
        organization_id: orgId,
        employee_number: empNum,
        name: emp.name,
        email: emp.email,
        phone: emp.phone || null,
        avatar: emp.avatar || null,
        job_title: emp.jobTitle,
        department: emp.department,
        work_location: emp.workLocation || 'HQ',
        start_date: emp.startDate,
        employment_type: emp.employmentType,
        status: emp.status,
        base_salary: emp.baseSalary,
        pay_frequency: emp.payFrequency,
        manager_name: emp.managerName || null,
      });

      if (error) {
        console.error('Error creating employee in Supabase:', error);
        throw new Error(`Failed to create employee: ${error.message}`);
      }
    }

    return {
      ...emp,
      id,
      employeeNumber: empNum,
      onboardingProgress: 100,
    };
  },

  async updateEmployeeDetails(orgId: string, employeeId: string, updates: Partial<Employee>): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
    if (updates.jobTitle) dbUpdates.job_title = updates.jobTitle;
    if (updates.department) dbUpdates.department = updates.department;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.baseSalary !== undefined) dbUpdates.base_salary = updates.baseSalary;

    const { error } = await supabase
      .from('employees')
      .update(dbUpdates)
      .eq('id', employeeId)
      .eq('organization_id', orgId);

    if (error) console.error('Error updating employee:', error);
  },

  // Attendance
  async fetchAttendance(orgId: string): Promise<AttendanceRecord[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      employeeAvatar: row.employee_avatar || '',
      department: row.department || 'General',
      date: row.date,
      checkIn: row.clock_in || '',
      checkOut: row.clock_out,
      breakDurationMins: row.break_duration_mins || 0,
      workedHours: Number(row.total_hours) || 0,
      expectedHours: 8,
      overtimeHours: Number(row.overtime_hours) || 0,
      status: row.status || 'Working',
      locationType: row.location_type || 'Office',
    }));
  },

  async clockIn(orgId: string, rec: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
    const id = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('attendance_records').insert({
        id,
        organization_id: orgId,
        employee_id: rec.employeeId,
        employee_name: rec.employeeName,
        employee_avatar: rec.employeeAvatar,
        department: rec.department,
        date: rec.date,
        clock_in: rec.checkIn,
        total_hours: rec.workedHours,
        status: rec.status,
      });
      if (error) console.error('Error recording attendance:', error);
    }
    return { ...rec, id };
  },

  async updateAttendance(orgId: string, recordId: string, updates: Partial<AttendanceRecord>): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.checkOut) dbUpdates.clock_out = updates.checkOut;
    if (updates.workedHours !== undefined) dbUpdates.total_hours = updates.workedHours;
    if (updates.breakDurationMins !== undefined) dbUpdates.break_duration_mins = updates.breakDurationMins;

    await supabase
      .from('attendance_records')
      .update(dbUpdates)
      .eq('id', recordId)
      .eq('organization_id', orgId);
  },

  // Time Off
  async fetchTimeOffRequests(orgId: string): Promise<TimeOffRequest[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      employeeAvatar: row.employee_avatar || '',
      department: row.department || 'General',
      leaveType: row.leave_type,
      startDate: row.start_date,
      endDate: row.end_date,
      totalDays: row.days_requested,
      reason: row.reason || '',
      status: row.status,
      approvedBy: row.approved_by,
      createdAt: row.created_at ? row.created_at.substring(0, 10) : new Date().toISOString().substring(0, 10),
    }));
  },

  async createTimeOffRequest(orgId: string, req: Omit<TimeOffRequest, 'id' | 'status' | 'createdAt'>): Promise<TimeOffRequest> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString().substring(0, 10);
    if (isSupabaseConfigured()) {
      await supabase.from('time_off_requests').insert({
        id,
        organization_id: orgId,
        employee_id: req.employeeId,
        employee_name: req.employeeName,
        employee_avatar: req.employeeAvatar,
        department: req.department,
        leave_type: req.leaveType,
        start_date: req.startDate,
        end_date: req.endDate,
        days_requested: req.totalDays,
        reason: req.reason,
        status: 'Pending',
      });
    }
    return { ...req, id, status: 'Pending', createdAt };
  },

  async updateTimeOffStatus(orgId: string, id: string, status: 'Approved' | 'Rejected', approvedBy: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    await supabase
      .from('time_off_requests')
      .update({ status, approved_by: approvedBy })
      .eq('id', id)
      .eq('organization_id', orgId);
  },

  // Appraisals
  async fetchAppraisals(orgId: string): Promise<Appraisal[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('appraisals')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      employeeAvatar: row.employee_avatar || '',
      jobTitle: row.job_title || 'Employee',
      department: row.department || 'General',
      managerName: 'Manager',
      cycleTitle: row.cycle_name,
      stage: row.stage || 'Self Review',
      selfRating: Number(row.self_rating) || 0,
      managerRating: Number(row.manager_rating) || 0,
      overallRating: Number(row.overall_rating) || 0,
      goalsOnTrackCount: row.goals_on_track_count || 4,
      status: row.status || 'In Progress',
    }));
  },

  async createAppraisal(orgId: string, emp: Employee, cycleName: string): Promise<Appraisal> {
    const id = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      await supabase.from('appraisals').insert({
        id,
        organization_id: orgId,
        employee_id: emp.id,
        employee_name: emp.name,
        employee_avatar: emp.avatar,
        job_title: emp.jobTitle,
        department: emp.department,
        cycle_name: cycleName,
        stage: 'Self Review',
        status: 'In Progress',
      });
    }
    return {
      id,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeAvatar: emp.avatar,
      jobTitle: emp.jobTitle,
      department: emp.department,
      managerName: emp.managerName || 'Manager',
      cycleTitle: cycleName,
      stage: 'Self Review',
      overallRating: 0,
      selfRating: 0,
      managerRating: 0,
      goalsOnTrackCount: 4,
      status: 'In Progress',
    };
  },

  async updateAppraisal(orgId: string, id: string, updates: Partial<Appraisal>): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const dbUpdates: any = {};
    if (updates.stage) dbUpdates.stage = updates.stage;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.selfRating !== undefined) dbUpdates.self_rating = updates.selfRating;
    if (updates.managerRating !== undefined) dbUpdates.manager_rating = updates.managerRating;
    if (updates.overallRating !== undefined) dbUpdates.overall_rating = updates.overallRating;

    await supabase
      .from('appraisals')
      .update(dbUpdates)
      .eq('id', id)
      .eq('organization_id', orgId);
  },

  // Fleet
  async fetchVehicles(orgId: string): Promise<Vehicle[]> {
    if (!isSupabaseConfigured() || !orgId) return [];
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('organization_id', orgId);

    if (error) return [];
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      make: row.make,
      model: row.model,
      year: row.year,
      licensePlate: row.license_plate,
      vin: row.vin,
      assignedEmployeeName: row.assigned_employee_name,
      odometerKm: row.odometer_km,
      monthlyCost: Number(row.monthly_cost),
      status: row.status,
    }));
  },

  async createVehicle(orgId: string, v: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    const id = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      await supabase.from('vehicles').insert({
        id,
        organization_id: orgId,
        name: v.name,
        make: v.make,
        model: v.model,
        year: v.year,
        license_plate: v.licensePlate,
        vin: v.vin,
        assigned_employee_name: v.assignedEmployeeName,
        odometer_km: v.odometerKm,
        monthly_cost: v.monthlyCost,
        status: v.status,
      });
    }
    return { ...v, id };
  },

  async addVehicleMaintenance(orgId: string, m: Omit<VehicleMaintenance, 'id'>): Promise<VehicleMaintenance> {
    const id = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      await supabase.from('vehicle_maintenance').insert({
        id,
        organization_id: orgId,
        vehicle_id: m.vehicleId,
        vehicle_name: m.vehicleName,
        type: m.type,
        date: m.date,
        vendor: m.vendor,
        cost: m.cost,
        odometer_km: m.odometerKm,
        next_service_date: m.nextServiceDate,
      });

      await supabase
        .from('vehicles')
        .update({ odometer_km: m.odometerKm })
        .eq('id', m.vehicleId);
    }
    return { ...m, id };
  },
};
