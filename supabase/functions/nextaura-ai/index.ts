import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.114.0";
import { createLocalAIResponse } from "../../../src/ai/engine/responseEngine.ts";
import type { LocalAIMessage, LocalAIResult } from "../../../src/ai/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getPublishableKey = (): string => {
  const keyMap = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (keyMap) {
    try {
      return JSON.parse(keyMap).default || "";
    } catch {
      // Fall through to the legacy anon key while projects migrate key formats.
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") || "";
};

const normalizeRole = (role: string) => role.trim().toLowerCase();
const hasRole = (role: string, allowed: string[]) =>
  allowed.includes(normalizeRole(role));
const ADMIN_ROLES = ["owner", "admin", "administrator"];
const FINANCE_ROLES = [
  ...ADMIN_ROLES,
  "finance manager",
  "accountant",
  "expense approver",
];
const PEOPLE_ROLES = [
  ...ADMIN_ROLES,
  "hr manager",
  "hr officer",
  "recruiter",
  "manager",
];
const PAYROLL_ROLES = [
  ...ADMIN_ROLES,
  "payroll manager",
  "hr manager",
  "finance manager",
];
const MARKETING_ROLES = [
  ...ADMIN_ROLES,
  "marketing manager",
  "marketing specialist",
  "content manager",
];

interface RetrievedSource {
  key: string;
  label: string;
  detail: string;
  data: unknown;
}

const recentRequests = new Map<string, number[]>();
const rateLimited = (userId: string): boolean => {
  const now = Date.now();
  const recent = (recentRequests.get(userId) || []).filter(
    (time) => now - time < 60_000,
  );
  recent.push(now);
  recentRequests.set(userId, recent);
  return recent.length > 20;
};

const includesAny = (query: string, terms: string[]) =>
  terms.some((term) => query.includes(term));

async function fetchRows(
  client: any,
  table: string,
  columns: string,
  organizationId: string,
  limit = 30,
): Promise<any[]> {
  const { data, error } = await client
    .from(table)
    .select(columns)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn(`[NextAura AI] ${table} context unavailable:`, error.code);
    return [];
  }
  return data || [];
}

async function countRows(
  client: any,
  table: string,
  organizationId: string,
  configure?: (query: any) => any,
): Promise<number | null> {
  let query = client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  if (configure) query = configure(query);
  const { count, error } = await query;
  return error ? null : (count ?? 0);
}

async function buildWorkspaceContext(
  client: any,
  organizationId: string,
  role: string,
  query: string,
  activeServices: string[],
) {
  const sources: RetrievedSource[] = [];
  const context: Record<string, unknown> = {};
  const genericFocus = includesAny(query, [
    "focus",
    "attention",
    "update",
    "summary",
    "business",
    "workspace",
    "today",
  ]);
  const wantsFinance =
    genericFocus ||
    includesAny(query, [
      "invoice",
      "customer",
      "owe",
      "receivable",
      "expense",
      "accounting",
      "ledger",
      "finance",
    ]);
  const wantsPeople =
    genericFocus ||
    includesAny(query, [
      "employee",
      "people",
      "team",
      "department",
      "attendance",
      "absent",
      "leave",
      "recruit",
      "candidate",
    ]);
  const wantsPayroll =
    genericFocus ||
    includesAny(query, [
      "payroll",
      "payslip",
      "salary",
      "gross pay",
      "net pay",
    ]);
  const wantsMarketing =
    genericFocus ||
    includesAny(query, [
      "campaign",
      "marketing",
      "email",
      "sms",
      "survey",
      "social",
      "post",
    ]);
  const wantsGlobal =
    genericFocus ||
    includesAny(query, [
      "contact",
      "calendar",
      "event",
      "service",
      "enabled",
      "app",
    ]);

  context.activeServices = activeServices;
  sources.push({
    key: "active-services",
    label: "Active services",
    detail: `${activeServices.length} enabled`,
    data: activeServices,
  });

  if (wantsFinance && hasRole(role, FINANCE_ROLES)) {
    if (activeServices.includes("invoicing")) {
      const [rows, totalCount, overdueCount, unpaidCount] = await Promise.all([
        fetchRows(
          client,
          "invoices",
          "invoice_number,customer_name,due_date,total_amount,amount_paid,status",
          organizationId,
        ),
        countRows(client, "invoices", organizationId),
        countRows(client, "invoices", organizationId, (request) =>
          request.eq("status", "Overdue"),
        ),
        countRows(client, "invoices", organizationId, (request) =>
          request.in("status", ["Sent", "Viewed", "Partially Paid", "Overdue"]),
        ),
      ]);
      const invoices = rows.map((row) => ({
        ...row,
        amount_due:
          Number(row.total_amount || 0) - Number(row.amount_paid || 0),
      }));
      context.invoices = invoices;
      context.invoiceCounts = {
        total: totalCount,
        overdue: overdueCount,
        unpaid: unpaidCount,
      };
      sources.push({
        key: "invoices",
        label: "Invoices",
        detail: `${totalCount ?? "Count unavailable"} total · ${invoices.length} recent retrieved`,
        data: invoices,
      });
    }
    if (activeServices.includes("expenses")) {
      const [expenses, submittedCount] = await Promise.all([
        fetchRows(
          client,
          "expenses",
          "title,merchant,date,category,amount,currency,status,employee_name",
          organizationId,
        ),
        countRows(client, "expenses", organizationId, (request) =>
          request.eq("status", "Submitted"),
        ),
      ]);
      context.expenses = expenses;
      context.expenseCounts = { submitted: submittedCount };
      sources.push({
        key: "expenses",
        label: "Expenses",
        detail: `${expenses.length} recent records retrieved`,
        data: expenses,
      });
    }
    if (activeServices.includes("accounting")) {
      const journals = await fetchRows(
        client,
        "journal_entries",
        "entry_number,date,description,total_debit,total_credit,status",
        organizationId,
        20,
      );
      context.journalEntries = journals;
      sources.push({
        key: "journal-entries",
        label: "Journal entries",
        detail: `${journals.length} recent records retrieved`,
        data: journals,
      });
    }
  }

  if (wantsPeople) {
    if (activeServices.includes("employees")) {
      const employeeColumns = hasRole(role, PEOPLE_ROLES)
        ? "name,job_title,department,status,work_location,start_date"
        : "name,job_title,department,status,work_location";
      const [employees, employeeCount, activeEmployeeCount] = await Promise.all(
        [
          fetchRows(client, "employees", employeeColumns, organizationId, 60),
          countRows(client, "employees", organizationId),
          countRows(client, "employees", organizationId, (request) =>
            request.eq("status", "Active"),
          ),
        ],
      );
      context.employees = employees;
      context.employeeCounts = {
        total: employeeCount,
        active: activeEmployeeCount,
      };
      sources.push({
        key: "employees",
        label: "Employee directory",
        detail: `${employeeCount ?? "Count unavailable"} total · ${employees.length} recent retrieved`,
        data: employees,
      });
    }

    if (activeServices.includes("attendance")) {
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: attendanceData, error: attendanceError }, absentCount] =
        await Promise.all([
          client
            .from("attendance_records")
            .select(
              "employee_name,department,date,status,clock_in,clock_out,total_hours",
            )
            .eq("organization_id", organizationId)
            .eq("date", today)
            .limit(80),
          countRows(client, "attendance_records", organizationId, (request) =>
            request.eq("date", today).eq("status", "Absent"),
          ),
        ]);
      const attendance = attendanceError ? [] : attendanceData || [];
      context.attendanceToday = attendance;
      context.attendanceDateBasis = `${today} UTC`;
      context.attendanceCounts = { explicitlyAbsent: absentCount };
      sources.push({
        key: "attendance",
        label: "Today’s attendance",
        detail: `${attendance.length} records for ${today} UTC`,
        data: attendance,
      });
    }

    if (hasRole(role, PEOPLE_ROLES) && activeServices.includes("time_off")) {
      const [leave, pendingLeaveCount] = await Promise.all([
        fetchRows(
          client,
          "time_off_requests",
          "employee_name,department,leave_type,start_date,end_date,days_requested,status",
          organizationId,
          30,
        ),
        countRows(client, "time_off_requests", organizationId, (request) =>
          request.eq("status", "Pending"),
        ),
      ]);
      context.timeOffRequests = leave;
      context.timeOffCounts = { pending: pendingLeaveCount };
      sources.push({
        key: "time-off",
        label: "Time-off requests",
        detail: `${leave.length} recent records retrieved`,
        data: leave,
      });
    }

    if (hasRole(role, PEOPLE_ROLES) && activeServices.includes("recruitment")) {
      const candidates = await fetchRows(
        client,
        "candidates",
        "name,role_applied,stage,score,interview_date",
        organizationId,
        30,
      );
      context.candidates = candidates;
      sources.push({
        key: "candidates",
        label: "Recruitment candidates",
        detail: `${candidates.length} recent records retrieved`,
        data: candidates,
      });
    }
  }

  if (wantsPayroll) {
    if (hasRole(role, PAYROLL_ROLES) && activeServices.includes("payroll")) {
      const [payroll, draftCount] = await Promise.all([
        fetchRows(
          client,
          "payroll_runs",
          "period,pay_date,employee_count,total_gross,total_deductions,total_net,status,created_at",
          organizationId,
          16,
        ),
        countRows(client, "payroll_runs", organizationId, (request) =>
          request.eq("status", "Draft"),
        ),
      ]);
      context.payrollRuns = payroll;
      context.payrollCounts = { draft: draftCount };
      sources.push({
        key: "payroll-runs",
        label: "Payroll runs",
        detail: `${payroll.length} recent aggregate records retrieved`,
        data: payroll,
      });
    } else {
      context.payrollPermission =
        "Payroll workspace data is not available to this membership role.";
    }
  }

  if (wantsMarketing && hasRole(role, MARKETING_ROLES)) {
    if (activeServices.includes("email_marketing")) {
      const campaigns = await fetchRows(
        client,
        "email_campaigns",
        "name,subject,status,target_segment,recipient_count,scheduled_for",
        organizationId,
        25,
      );
      context.emailCampaigns = campaigns;
      sources.push({
        key: "email-campaigns",
        label: "Email campaigns",
        detail: `${campaigns.length} recent records retrieved`,
        data: campaigns,
      });
    }
    if (activeServices.includes("sms_marketing")) {
      const broadcasts = await fetchRows(
        client,
        "sms_campaigns",
        "name,status,target_audience,recipient_count,created_at",
        organizationId,
        25,
      );
      context.smsBroadcasts = broadcasts;
      sources.push({
        key: "sms-broadcasts",
        label: "SMS broadcasts",
        detail: `${broadcasts.length} recent records retrieved`,
        data: broadcasts,
      });
    }
    if (activeServices.includes("surveys")) {
      const surveys = await fetchRows(
        client,
        "surveys",
        "title,category,status,questions_count,responses_count,completion_rate",
        organizationId,
        25,
      );
      context.surveys = surveys;
      sources.push({
        key: "surveys",
        label: "Surveys",
        detail: `${surveys.length} recent records retrieved`,
        data: surveys,
      });
    }
    if (activeServices.includes("social_marketing")) {
      const posts = await fetchRows(
        client,
        "social_posts",
        "content,platforms,status,scheduled_for",
        organizationId,
        25,
      );
      context.socialPosts = posts;
      sources.push({
        key: "social-posts",
        label: "Social posts",
        detail: `${posts.length} recent records retrieved`,
        data: posts,
      });
    }
  }

  if (wantsGlobal) {
    const contactColumns = hasRole(role, FINANCE_ROLES)
      ? "name,email,company_name,type,roles,balance,status"
      : "name,company_name,type,roles,status";
    const [contacts, events, contactCount] = await Promise.all([
      fetchRows(client, "contacts", contactColumns, organizationId, 40),
      fetchRows(
        client,
        "calendar_events",
        "title,date,time,type,module",
        organizationId,
        30,
      ),
      countRows(client, "contacts", organizationId),
    ]);
    context.contacts = contacts;
    context.calendarEvents = events;
    context.contactCounts = { total: contactCount };
    sources.push({
      key: "contacts",
      label: "Contacts",
      detail: `${contactCount ?? "Count unavailable"} total · ${contacts.length} recent retrieved`,
      data: contacts,
    });
    sources.push({
      key: "calendar",
      label: "Calendar",
      detail: `${events.length} recent records retrieved`,
      data: events,
    });
  }

  return { context, sources };
}

const validApps = new Set([
  "home",
  "launchpad",
  "invoicing",
  "accounting",
  "expenses",
  "sign",
  "equity",
  "esg",
  "employees",
  "attendance",
  "recruitment",
  "time-off",
  "appraisals",
  "fleet",
  "payroll",
  "email",
  "sms",
  "surveys",
  "social",
  "calendar",
  "approvals",
  "contacts",
  "documents",
  "analytics",
  "pricing",
  "settings",
  "ai",
]);
const appService: Record<string, string> = {
  invoicing: "invoicing",
  accounting: "accounting",
  expenses: "expenses",
  sign: "sign",
  equity: "equity",
  esg: "esg",
  employees: "employees",
  attendance: "attendance",
  recruitment: "recruitment",
  "time-off": "time_off",
  appraisals: "appraisals",
  fleet: "fleet",
  payroll: "payroll",
  email: "email_marketing",
  sms: "sms_marketing",
  surveys: "surveys",
  social: "social_marketing",
  contacts: "contacts",
  documents: "documents",
  analytics: "analytics",
};
const defaultSubviews: Record<string, string> = {
  accounting: "ledger",
  equity: "cap-table",
  recruitment: "kanban",
  "time-off": "requests",
  payroll: "runs",
};

const sanitizeLocalOutput = (
  localResult: LocalAIResult,
  sources: RetrievedSource[],
  activeServices: string[],
) => {
  const sourceMap = new Map(sources.map((source) => [source.key, source]));
  const safeSources = localResult.sourceKeys
    .map((key: unknown) =>
      typeof key === "string" ? sourceMap.get(key) : undefined,
    )
    .filter(Boolean)
    .slice(0, 4)
    .map((source: RetrievedSource) => ({
      key: source.key,
      label: source.label,
      detail: source.detail,
    }));

  const safeActions = localResult.actions
    .filter(
      (action: any) =>
        action &&
        typeof action.label === "string" &&
        typeof action.app === "string" &&
        validApps.has(action.app),
    )
    .filter(
      (action: any) =>
        !appService[action.app] ||
        activeServices.includes(appService[action.app]),
    )
    .slice(0, 3)
    .map((action: any) => ({
      label: action.label.slice(0, 72),
      app: action.app,
      subView:
        typeof action.subView === "string"
          ? action.subView.slice(0, 48)
          : defaultSubviews[action.app] || "overview",
    }));

  return {
    answer: localResult.answer,
    sources: safeSources,
    actions: safeActions,
    suggestions: localResult.suggestions.slice(0, 4).map((suggestion) => ({
      label: suggestion.label.slice(0, 80),
      prompt: suggestion.prompt.slice(0, 240),
    })),
    intent: localResult.intent,
    confidence: localResult.confidence,
    conversationContext: localResult.conversationContext,
    engine: localResult.engine,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return jsonResponse(
      {
        success: false,
        code: "METHOD_NOT_ALLOWED",
        error: "POST is required.",
      },
      405,
    );

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        {
          success: false,
          code: "UNAUTHORIZED",
          error: "A signed-in NextAura session is required.",
        },
        401,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const publishableKey = getPublishableKey();
    if (!supabaseUrl || !publishableKey) {
      return jsonResponse(
        {
          success: false,
          code: "SERVER_CONFIGURATION",
          error: "Supabase user-scoped configuration is unavailable.",
        },
        503,
      );
    }

    const token = authorization.slice("Bearer ".length);
    const client = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser(token);
    if (userError || !user)
      return jsonResponse(
        {
          success: false,
          code: "UNAUTHORIZED",
          error: "The NextAura session could not be verified.",
        },
        401,
      );
    if (rateLimited(user.id))
      return jsonResponse(
        {
          success: false,
          code: "RATE_LIMITED",
          error: "Please wait a moment before asking again.",
        },
        429,
      );

    const body = await req.json().catch(() => ({}));
    const organizationId =
      typeof body.organizationId === "string" ? body.organizationId : "";
    const activeApp =
      typeof body.activeApp === "string" ? body.activeApp.slice(0, 64) : "ai";
    const activeSubView =
      typeof body.activeSubView === "string"
        ? body.activeSubView.slice(0, 64)
        : "overview";
    const incomingMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages: LocalAIMessage[] = incomingMessages
      .filter(
        (message: any) =>
          (message?.role === "user" || message?.role === "assistant") &&
          typeof message?.content === "string",
      )
      .slice(-12)
      .map((message: any) => ({
        role: message.role,
        content: message.content.trim().slice(0, 4000),
      }))
      .filter((message: LocalAIMessage) => message.content.length > 0);

    if (
      !organizationId ||
      messages.length === 0 ||
      messages[messages.length - 1].role !== "user"
    ) {
      return jsonResponse(
        {
          success: false,
          code: "INVALID_REQUEST",
          error: "A workspace and user message are required.",
        },
        400,
      );
    }

    const { data: membership, error: membershipError } = await client
      .from("organization_members")
      .select("role,status,organizations(name)")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .eq("status", "Active")
      .single();

    if (membershipError || !membership) {
      return jsonResponse(
        {
          success: false,
          code: "FORBIDDEN",
          error: "This workspace is not available to the signed-in member.",
        },
        403,
      );
    }

    const { data: serviceRows } = await client
      .from("organization_services")
      .select("service_key")
      .eq("organization_id", organizationId)
      .eq("status", "active");
    const activeServices = (serviceRows || [])
      .map((row: any) => row.service_key)
      .filter(Boolean);
    const role = membership.role || "Employee";
    const query = messages[messages.length - 1].content;
    const contextQuery = messages.slice(-6).map((message) => message.content).join(" ").toLowerCase();
    const { context, sources } = await buildWorkspaceContext(
      client,
      organizationId,
      role,
      contextQuery,
      activeServices,
    );
    const organizationName =
      (membership as any).organizations?.name || "Current workspace";
    const localResult = createLocalAIResponse({
      query,
      messages,
      activeApp,
      activeSubView,
      activeServices,
      workspaceName: organizationName,
      role,
      workspaceContext: context,
    });
    const result = sanitizeLocalOutput(localResult, sources, activeServices);
    return jsonResponse({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[NextAura AI] request failed:", error?.message || error);
    return jsonResponse(
      {
        success: false,
        code: "AI_REQUEST_FAILED",
        error: "NextAura AI could not complete this request. Please retry.",
      },
      502,
    );
  }
});
