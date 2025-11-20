CREATE TYPE "public"."unit" AS ENUM('pcs', 'kg', 'liter', 'meter', 'box');--> statement-breakpoint
CREATE TABLE "Product" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "Product_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sku" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"unit" "unit" DEFAULT 'pcs' NOT NULL,
	"min_stock" integer DEFAULT 0 NOT NULL,
	"reorder_point" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Product_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "product_sku_idx" ON "Product" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "product_category_idx" ON "Product" USING btree ("category");--> statement-breakpoint
CREATE INDEX "product_name_idx" ON "Product" USING btree ("name");