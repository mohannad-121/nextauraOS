import {
  Bell,
  Bot,
  CalendarDays,
  ContactRound,
  GitBranch,
  Layers3,
  Mail,
  MessageSquare,
  Send,
  Sheet,
  UserPlus,
  Webhook,
  type LucideIcon,
} from "lucide-react";

export type NodeCategory =
  "Trigger" | "Logic" | "Action" | "Integration" | "AI" | "Data" | "Utility";
export type ConfigField = {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "url"
    | "number"
    | "boolean"
    | "secret-placeholder"
    | "info";
  options?: string[];
  placeholder?: string;
  description?: string;
};
export type AutomationNodeDefinition = {
  type: string;
  title: string;
  category: NodeCategory;
  description: string;
  icon: LucideIcon;
  accent: "emerald" | "amber" | "blue" | "purple" | "cyan";
  available: boolean;
  kind: "trigger" | "logic" | "action" | "integration" | "ai";
  inputs: string[];
  outputs: string[];
  fields: ConfigField[];
  defaultConfig: Record<string, unknown>;
  validate: (config: Record<string, unknown>) => boolean;
  adapterKey?: string;
  entitlement?: string;
  provider?: string;
  requires_connection?: boolean;
  connection_type?: "oauth" | "api_key";
  required_scopes?: string[];
};
const anyConfig = () => true;
const definitions: AutomationNodeDefinition[] = [
  {
    type: "gmail_send_email", title: "Gmail · Send Email", category: "Integration", description: "Send an email through Gmail", icon: Mail, accent: "purple", available: true, kind: "integration", inputs: ["default"], outputs: ["default"], fields: [], defaultConfig: { connection_id: "", to: "", cc: "", bcc: "", subject: "", body: "" }, validate: anyConfig, provider: "google", requires_connection: true, connection_type: "oauth", required_scopes: ["https://www.googleapis.com/auth/gmail.send"], adapterKey: "gmail.send_email", entitlement: "automation_access",
  },
  {
    type: "employee_created",
    title: "Employee Created",
    category: "Trigger",
    description: "Runs when a new employee is added",
    icon: UserPlus,
    accent: "emerald",
    available: true,
    kind: "trigger",
    inputs: [],
    outputs: ["default"],
    fields: [
      {
        key: "info",
        label: "Trigger information",
        type: "info",
        description: "This trigger needs no additional configuration.",
      },
    ],
    defaultConfig: {},
    validate: anyConfig,
    adapterKey: "employee.created",
  },
  {
    type: "contact_created",
    title: "Contact Created",
    category: "Trigger",
    description: "Runs when a new contact is created",
    icon: ContactRound,
    accent: "emerald",
    available: true,
    kind: "trigger",
    inputs: [],
    outputs: ["default"],
    fields: [
      {
        key: "info",
        label: "Trigger information",
        type: "info",
        description: "This trigger needs no additional configuration.",
      },
    ],
    defaultConfig: {},
    validate: anyConfig,
    adapterKey: "contact.created",
  },
  {
    type: "expense_status_changed",
    title: "Expense Status Changed",
    category: "Trigger",
    description: "Runs when an expense changes status",
    icon: Layers3,
    accent: "emerald",
    available: true,
    kind: "trigger",
    inputs: [],
    outputs: ["default"],
    fields: [
      {
        key: "to_status",
        label: "New status",
        type: "select",
        options: ["Pending", "Approved", "Rejected", "Paid"],
      },
    ],
    defaultConfig: { to_status: "Pending" },
    validate: anyConfig,
    adapterKey: "expense.status_changed",
  },
  {
    type: "incoming_webhook",
    title: "Incoming Webhook",
    category: "Trigger",
    description: "Runs when a secure webhook arrives",
    icon: Webhook,
    accent: "emerald",
    available: true,
    kind: "trigger",
    inputs: [],
    outputs: ["default"],
    fields: [
      {
        key: "info",
        label: "Trigger information",
        type: "info",
        description: "This trigger needs no additional configuration.",
      },
    ],
    defaultConfig: {},
    validate: anyConfig,
    adapterKey: "incoming_webhook",
  },
  {
    type: "if",
    title: "IF",
    category: "Logic",
    description: "Route workflow based on a condition",
    icon: GitBranch,
    accent: "amber",
    available: true,
    kind: "logic",
    inputs: ["default"],
    outputs: ["true", "false"],
    fields: [
      {
        key: "field",
        label: "Field",
        type: "text",
        placeholder: "e.g. status",
      },
      {
        key: "operator",
        label: "Operator",
        type: "select",
        options: [
          "equals",
          "not_equals",
          "contains",
          "greater_than",
          "less_than",
          "is_empty",
          "is_not_empty",
          "changed_from",
          "changed_to",
        ],
      },
      { key: "value", label: "Value", type: "text", placeholder: "Value" },
    ],
    defaultConfig: { field: "status", operator: "equals", value: "" },
    validate: anyConfig,
  },
  {
    type: "create_notification",
    title: "Create Notification",
    category: "Action",
    description: "Create an in-app notification",
    icon: Bell,
    accent: "blue",
    available: true,
    kind: "action",
    inputs: ["default"],
    outputs: ["default"],
    fields: [
      {
        key: "title",
        label: "Title",
        type: "text",
        placeholder: "Notification title",
      },
      {
        key: "message",
        label: "Message",
        type: "textarea",
        placeholder: "Notification message",
      },
    ],
    defaultConfig: {
      title: "Automation update",
      message: "A workflow event was completed.",
    },
    validate: anyConfig,
    adapterKey: "create_notification",
  },
  {
    type: "outgoing_webhook",
    title: "Send Webhook",
    category: "Action",
    description: "POST data to an external endpoint",
    icon: Send,
    accent: "blue",
    available: true,
    kind: "action",
    inputs: ["default"],
    outputs: ["default"],
    fields: [
      {
        key: "url",
        label: "Endpoint URL",
        type: "url",
        placeholder: "https://example.com/webhook",
      },
      {
        key: "method",
        label: "Method",
        type: "info",
        description: "POST is fixed for secure webhook delivery.",
      },
    ],
    defaultConfig: { url: "", method: "POST" },
    validate: anyConfig,
    adapterKey: "outgoing_webhook",
    entitlement: "automation_access",
  },
  ...[
    ["slack", "Slack", Send, "slack"],
    ["whatsapp", "WhatsApp", Send, "meta"],
    ["google_sheets", "Google Sheets", Sheet, "google"],
    ["google_calendar", "Google Calendar", CalendarDays, "google"],
  ].map(([type, title, icon, provider]: any) => ({
    type,
    title,
    category: "Integration" as const,
    description: "Coming soon — connection required",
    icon,
    accent: "purple" as const,
    available: false,
    kind: "integration" as const,
    inputs: ["default"],
    outputs: ["default"],
    fields: [],
    defaultConfig: {},
    validate: anyConfig,
    provider,
    requires_connection: true,
    connection_type: "oauth" as const,
  })),
  {
    type: "facebook_page_comment_created",
    title: "New Page Comment",
    category: "Trigger",
    description: "Runs when a new comment is posted on a Facebook Page",
    icon: Bot,
    accent: "emerald",
    available: true,
    kind: "trigger",
    inputs: [],
    outputs: ["default"],
    fields: [
      {
        key: "resource_id",
        label: "Facebook Page",
        type: "select",
        options: [],
        description: "Select the specific Facebook page in the workflow UI."
      },
      {
        key: "contains_text",
        label: "Message contains (optional)",
        type: "text",
        placeholder: "e.g. refund"
      },
      {
        key: "exact_post_id",
        label: "Exact Post ID (optional)",
        type: "text",
        placeholder: "Limit to one specific post"
      },
      {
        key: "include_replies",
        label: "Include replies to comments",
        type: "boolean"
      }
    ],
    defaultConfig: { connection_id: "", resource_id: "", contains_text: "", exact_post_id: "", include_replies: false },
    validate: (config: any) => Boolean(config.connection_id && config.resource_id),
    provider: "meta",
    requires_connection: true,
    connection_type: "oauth",
    required_scopes: ["pages_show_list", "pages_read_engagement"],
    adapterKey: "facebook.page.comment.created",
  },
  {
    type: "facebook_comment_reply",
    title: "Facebook · Reply to Comment",
    category: "Integration",
    description: "Reply to a Facebook comment using the connected Page",
    icon: MessageSquare,
    accent: "purple",
    available: true,
    kind: "integration",
    inputs: ["default"],
    outputs: ["default"],
    fields: [
      {
        key: "resource_id",
        label: "Facebook Page",
        type: "select",
        options: [],
        description: "Select the specific Facebook page in the workflow UI.",
      },
      {
        key: "comment_id",
        label: "Comment ID",
        type: "text",
        placeholder: "{{trigger.comment_id}}",
        description: "ID of the comment to reply to.",
      },
      {
        key: "message",
        label: "Reply Message",
        type: "textarea",
        placeholder: "Write a reply...",
        description: "Message content to post as a reply.",
      },
    ],
    defaultConfig: {
      connection_id: "",
      resource_id: "",
      comment_id: "{{trigger.comment_id}}",
      message: "",
    },
    validate: (config: any) =>
      Boolean(
        config.connection_id &&
          config.resource_id &&
          config.comment_id &&
          config.message,
      ),
    provider: "meta",
    requires_connection: true,
    connection_type: "oauth",
    required_scopes: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_engagement",
    ],
    adapterKey: "facebook.comment.reply",
    entitlement: "automation_access",
  },
  {
    type: "ai_agent",

    title: "AI Agent",
    category: "AI",
    description: "Coming soon — AI workflow step",
    icon: Bot,
    accent: "cyan",
    available: false,
    kind: "ai",
    inputs: ["default"],
    outputs: ["default"],
    fields: [],
    defaultConfig: {},
    validate: anyConfig,
    entitlement: "ai_access",
  },
];
export const nodeRegistry = definitions;
export const nodeByType = Object.fromEntries(
  definitions.map((node) => [node.type, node]),
);
export const availableNodeTypes = new Set(
  definitions.filter((node) => node.available).map((node) => node.type),
);
