CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."subscription_invoice_status" AS ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TABLE "subscription_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"status" "subscription_invoice_status" DEFAULT 'pending' NOT NULL,
	"plan" "subscription_plan" NOT NULL,
	"billing_cycle" "billing_cycle" NOT NULL,
	"mayar_payment_id" text,
	"mayar_transaction_id" text,
	"payment_url" text,
	"qr_code_url" text,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'starter' NOT NULL,
	"status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"billing_cycle" "billing_cycle" DEFAULT 'monthly' NOT NULL,
	"price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"mayar_customer_id" text,
	"mayar_subscription_id" text,
	"trial_starts_at" timestamp,
	"trial_ends_at" timestamp,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancelled_at" timestamp,
	"monthly_order_count" integer DEFAULT 0 NOT NULL,
	"last_order_count_reset" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_invoices_subscription_id_idx" ON "subscription_invoices" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_invoices_organization_id_idx" ON "subscription_invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscription_invoices_status_idx" ON "subscription_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscription_invoices_mayar_payment_id_idx" ON "subscription_invoices" USING btree ("mayar_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_invoices_invoice_number_idx" ON "subscription_invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "subscriptions_organization_id_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_mayar_subscription_id_idx" ON "subscriptions" USING btree ("mayar_subscription_id");