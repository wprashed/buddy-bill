CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY,
	"code" varchar(50) NOT NULL UNIQUE,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"icon" varchar(10) NOT NULL,
	"criteria" jsonb
);
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" serial PRIMARY KEY,
	"group_id" integer,
	"user_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" serial PRIMARY KEY,
	"admin_user_id" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" integer,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL UNIQUE,
	"role" varchar(20) DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_comments" (
	"id" serial PRIMARY KEY,
	"expense_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_splits" (
	"id" serial PRIMARY KEY,
	"expense_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"amount" numeric(12,2) NOT NULL,
	"percentage" numeric(5,2),
	"shares" integer,
	"settled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_templates" (
	"id" serial PRIMARY KEY,
	"group_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(500) NOT NULL,
	"amount" numeric(12,2),
	"category" varchar(100) DEFAULT 'General',
	"split_type" varchar(20) DEFAULT 'equal' NOT NULL,
	"split_config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY,
	"group_id" integer NOT NULL,
	"paid_by_id" integer NOT NULL,
	"description" varchar(500) NOT NULL,
	"amount" numeric(12,2) NOT NULL,
	"category" varchar(100) DEFAULT 'General',
	"split_type" varchar(20) DEFAULT 'equal' NOT NULL,
	"receipt_url" text,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_frequency" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" serial PRIMARY KEY,
	"key" varchar(100) NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friends" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"friend_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" serial PRIMARY KEY,
	"group_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_by" integer NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"invite_code" varchar(32) UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" serial PRIMARY KEY,
	"key" varchar(100) NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb,
	"category" varchar(50) DEFAULT 'payment' NOT NULL,
	"icon_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nudges" (
	"id" serial PRIMARY KEY,
	"from_user_id" integer NOT NULL,
	"to_user_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"amount" numeric(12,2),
	"message" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"token" varchar(255) NOT NULL UNIQUE,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" serial PRIMARY KEY,
	"group_id" integer NOT NULL,
	"from_user_id" integer NOT NULL,
	"to_user_id" integer NOT NULL,
	"amount" numeric(12,2) NOT NULL,
	"is_partial" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY,
	"key" varchar(100) NOT NULL UNIQUE,
	"value" text,
	"type" varchar(20) DEFAULT 'string' NOT NULL,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"achievement_id" integer NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"token" varchar(255) NOT NULL UNIQUE,
	"user_agent" text,
	"ip_address" varchar(45),
	"last_active" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"password_hash" varchar(255) NOT NULL,
	"avatar_color" varchar(7) DEFAULT '#6366f1' NOT NULL,
	"dark_mode" boolean DEFAULT false NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_user_id_users_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "expense_comments" ADD CONSTRAINT "expense_comments_expense_id_expenses_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "expense_comments" ADD CONSTRAINT "expense_comments_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_id_expenses_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "expense_templates" ADD CONSTRAINT "expense_templates_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "expense_templates" ADD CONSTRAINT "expense_templates_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_id_users_id_fkey" FOREIGN KEY ("paid_by_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_friend_id_users_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "nudges" ADD CONSTRAINT "nudges_from_user_id_users_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "nudges" ADD CONSTRAINT "nudges_to_user_id_users_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "nudges" ADD CONSTRAINT "nudges_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_user_id_users_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_user_id_users_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;