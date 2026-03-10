ALTER TABLE "orders" ADD COLUMN "mayar_payment_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "mayar_transaction_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "qr_code_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_expired_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
CREATE INDEX "orders_mayar_payment_id_idx" ON "orders" USING btree ("mayar_payment_id");