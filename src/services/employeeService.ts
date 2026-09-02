import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Employee, Vehicle, VehicleMaintenance } from '../types';

export const employeeService = {
  async fetchEmployees(orgId: string): Promise<Employee[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error fetching employees from Supabase:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      employeeNumber: row.employee_number,
      name: row.name,
      email: row.email,
      phone: row.phone,
      avatar: row.avatar,
      jobTitle: row.job_title,
      department: row.department,
      workLocation: row.work_location,
      startDate: row.start_date,
      employmentType: row.employment_type,
      status: row.status,
      baseSalary: Number(row.base_salary),
      payFrequency: row.pay_frequency,
      managerName: row.manager_name,
      skills: [{ name: 'Enterprise SaaS', level: 'Expert' }],
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
        phone: emp.phone,
        avatar: emp.avatar,
        job_title: emp.jobTitle,
        department: emp.department,
        work_location: emp.workLocation,
        start_date: emp.startDate,
        employment_type: emp.employmentType,
        status: emp.status,
        base_salary: emp.baseSalary,
        pay_frequency: emp.payFrequency,
        manager_name: emp.managerName,
      });

      if (error) console.error('Error creating employee in Supabase:', error);
    }

    return {
      ...emp,
      id,
      employeeNumber: empNum,
      onboardingProgress: 100,
    };
  },

  async fetchVehicles(orgId: string): Promise<Vehicle[]> {
    if (!isSupabaseConfigured()) return [];
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
