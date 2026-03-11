CREATE TYPE "public"."addon_purchase_status" AS ENUM('pending', 'active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."addon_type" AS ENUM('custom_domain', 'whatsapp_quota');--> statement-breakpoint
CREATE TYPE "public"."member_package_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."member_subscription_status" AS ENUM('active', 'expired', 'cancelled', 'paused');--> statement-breakpoint
CREATE TABLE "addon_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "addon_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"duration_days" integer NOT NULL,
	"quota" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "addon_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"status" "addon_purchase_status" DEFAULT 'pending',
	"start_date" timestamp,
	"end_date" timestamp,
	"custom_domain" text,
	"custom_domain_verified" boolean DEFAULT false,
	"custom_domain_verified_at" timestamp,
	"whatsapp_quota" integer DEFAULT 0,
	"whatsapp_used" integer DEFAULT 0,
	"payment_amount" integer,
	"payment_status" text DEFAULT 'pending',
	"mayar_payment_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coupon_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"customer_phone" text NOT NULL,
	"discount_amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"type" "coupon_type" NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"scope" "coupon_scope" DEFAULT 'all' NOT NULL,
	"category" text,
	"service_id" uuid,
	"min_order_amount" numeric(15, 2),
	"max_discount" numeric(15, 2),
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"per_user_limit" integer DEFAULT 1,
	"valid_from" timestamp,
	"valid_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"tier_id" uuid NOT NULL,
	"points" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_spent" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"current_period_start" timestamp DEFAULT now() NOT NULL,
	"current_period_end" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"discount_type" text DEFAULT 'percentage' NOT NULL,
	"discount_value" integer DEFAULT 0 NOT NULL,
	"max_weight_kg" integer,
	"free_pickup_delivery" boolean DEFAULT false,
	"max_transactions_per_month" integer,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "member_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid,
	"customer_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"status" "member_subscription_status" DEFAULT 'active' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"auto_renew" boolean DEFAULT true,
	"mayar_subscription_id" text,
	"transactions_this_month" integer DEFAULT 0,
	"last_transaction_reset" timestamp DEFAULT now(),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "membership_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"tier" "membership_tier" NOT NULL,
	"min_spending" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discount_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"point_multiplier" numeric(5, 2) DEFAULT '1' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "membership_tiers_tier_unique" UNIQUE("tier")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"fee" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_amount" numeric(15, 2) NOT NULL,
	"status" "withdrawal_status" DEFAULT 'pending' NOT NULL,
	"bank_name" text NOT NULL,
	"bank_account_number" text NOT NULL,
	"bank_account_name" text NOT NULL,
	"mayar_withdrawal_id" text,
	"mayar_withdrawal_status" text,
	"notes" text,
	"rejected_reason" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "transaction_fee" numeric(15, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "addon_purchases" ADD CONSTRAINT "addon_purchases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addon_purchases" ADD CONSTRAINT "addon_purchases_product_id_addon_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."addon_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_memberships" ADD CONSTRAINT "customer_memberships_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_memberships" ADD CONSTRAINT "customer_memberships_tier_id_membership_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_package_id_member_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."member_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_tiers" ADD CONSTRAINT "membership_tiers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addon_products_type_idx" ON "addon_products" USING btree ("type");--> statement-breakpoint
CREATE INDEX "addon_products_active_idx" ON "addon_products" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "addon_purchases_org_idx" ON "addon_purchases" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "addon_purchases_status_idx" ON "addon_purchases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "coupon_usages_coupon_id_idx" ON "coupon_usages" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "coupon_usages_order_id_idx" ON "coupon_usages" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "coupons_organization_id_idx" ON "coupons" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "coupons_code_idx" ON "coupons" USING btree ("code");--> statement-breakpoint
CREATE INDEX "customer_memberships_customer_id_idx" ON "customer_memberships" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_memberships_tier_id_idx" ON "customer_memberships" USING btree ("tier_id");--> statement-breakpoint
CREATE INDEX "member_packages_org_idx" ON "member_packages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_packages_active_idx" ON "member_packages" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "member_subs_org_idx" ON "member_subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_subs_customer_idx" ON "member_subscriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "member_subs_status_idx" ON "member_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "member_subs_package_idx" ON "member_subscriptions" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "membership_tiers_organization_id_idx" ON "membership_tiers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "membership_tiers_tier_idx" ON "membership_tiers" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "platform_settings_key_idx" ON "platform_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "withdrawals_organization_id_idx" ON "withdrawals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "withdrawals_status_idx" ON "withdrawals" USING btree ("status");