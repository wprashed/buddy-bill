import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { featureFlags, integrations, systemSettings } from "@/db/schema";
import { isAuthResponse, requireAdminSession } from "@/lib/adminAuth";

const DEFAULT_FEATURES = [
  { key: "dark_mode", name: "Dark Mode", description: "Allow users to switch to dark theme", category: "ui", enabled: true },
  { key: "achievements", name: "Achievements", description: "Gamification badges and achievements", category: "gamification", enabled: true },
  { key: "expense_comments", name: "Expense Comments", description: "Allow comments on expenses", category: "expenses", enabled: true },
  { key: "expense_templates", name: "Expense Templates", description: "Save and reuse expense templates", category: "expenses", enabled: true },
  { key: "unequal_splits", name: "Unequal Splits", description: "Split by percentage, exact amounts, or shares", category: "expenses", enabled: true },
  { key: "recurring_expenses", name: "Recurring Expenses", description: "Auto-create monthly/weekly expenses", category: "expenses", enabled: false },
  { key: "receipt_upload", name: "Receipt Upload", description: "Attach photos of receipts", category: "expenses", enabled: false },
  { key: "export_csv", name: "Export to CSV", description: "Download expense history as CSV", category: "export", enabled: true },
  { key: "nudge_reminders", name: "Nudge Reminders", description: "Send payment reminders", category: "notifications", enabled: true },
  { key: "email_notifications", name: "Email Notifications", description: "Send email notifications for activities", category: "notifications", enabled: false },
  { key: "group_invite_links", name: "Group Invite Links", description: "Share invite codes to join groups", category: "groups", enabled: true },
  { key: "group_roles", name: "Group Roles", description: "Admin and member roles in groups", category: "groups", enabled: true },
  { key: "activity_feed", name: "Activity Feed", description: "Show recent activity timeline", category: "ui", enabled: true },
  { key: "analytics_dashboard", name: "Analytics Dashboard", description: "Spending analytics and charts", category: "analytics", enabled: true },
];

const DEFAULT_INTEGRATIONS = [
  { key: "stripe", name: "Stripe", description: "Accept payments via Stripe", category: "payment", enabled: false, iconUrl: "https://stripe.com/favicon.ico" },
  { key: "paypal", name: "PayPal", description: "PayPal payment integration", category: "payment", enabled: false, iconUrl: "https://paypal.com/favicon.ico" },
  { key: "venmo", name: "Venmo", description: "Generate Venmo payment links", category: "payment", enabled: false, iconUrl: "https://venmo.com/favicon.ico" },
  { key: "slack", name: "Slack", description: "Slack bot for expense notifications", category: "communication", enabled: false, iconUrl: "https://slack.com/favicon.ico" },
  { key: "discord", name: "Discord", description: "Discord bot integration", category: "communication", enabled: false, iconUrl: "https://discord.com/favicon.ico" },
  { key: "google_auth", name: "Google Sign-In", description: "Allow sign-in with Google", category: "auth", enabled: false, iconUrl: "https://google.com/favicon.ico" },
  { key: "apple_auth", name: "Apple Sign-In", description: "Allow sign-in with Apple", category: "auth", enabled: false, iconUrl: "https://apple.com/favicon.ico" },
  { key: "sendgrid", name: "SendGrid", description: "Email delivery via SendGrid", category: "email", enabled: false, iconUrl: "https://sendgrid.com/favicon.ico" },
  { key: "twilio", name: "Twilio", description: "SMS notifications via Twilio", category: "sms", enabled: false, iconUrl: "https://twilio.com/favicon.ico" },
  { key: "plaid", name: "Plaid", description: "Bank account linking via Plaid", category: "banking", enabled: false, iconUrl: "https://plaid.com/favicon.ico" },
];

const DEFAULT_SETTINGS = [
  { key: "app_name", value: "BuddyBill", type: "string", category: "branding", description: "Application name" },
  { key: "max_group_members", value: "50", type: "number", category: "limits", description: "Maximum members per group" },
  { key: "max_expense_amount", value: "100000", type: "number", category: "limits", description: "Maximum expense amount" },
  { key: "default_currency", value: "USD", type: "string", category: "localization", description: "Default currency code" },
  { key: "session_timeout_hours", value: "168", type: "number", category: "security", description: "Session timeout in hours (default: 7 days)" },
  { key: "enable_registration", value: "true", type: "boolean", category: "auth", description: "Allow new user registrations" },
  { key: "maintenance_mode", value: "false", type: "boolean", category: "system", description: "Enable maintenance mode" },
  { key: "support_email", value: "support@buddybill.app", type: "string", category: "support", description: "Support email address" },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const admin = await requireAdminSession(req, body.sessionToken);
    if (isAuthResponse(admin)) return admin;

    // Seed feature flags
    for (const feature of DEFAULT_FEATURES) {
      await db.insert(featureFlags).values(feature).onConflictDoNothing();
    }

    // Seed integrations
    for (const integration of DEFAULT_INTEGRATIONS) {
      await db.insert(integrations).values(integration).onConflictDoNothing();
    }

    // Seed settings
    for (const setting of DEFAULT_SETTINGS) {
      await db.insert(systemSettings).values(setting).onConflictDoNothing();
    }

    return NextResponse.json({ success: true, message: "Admin data seeded" });
  } catch (err) {
    console.error("Admin seed error:", err);
    const message = err instanceof Error ? err.message : "Seed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
