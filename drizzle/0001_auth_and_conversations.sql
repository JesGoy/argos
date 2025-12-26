CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');
--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'warehouse_manager', 'operator', 'viewer');
--> statement-breakpoint
CREATE TABLE "User" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "username" varchar(50) NOT NULL,
    "email" varchar(100) NOT NULL,
    "password_hash" text NOT NULL,
    "role" "user_role" DEFAULT 'viewer' NOT NULL,
    "full_name" varchar(100),
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "User_username_unique" UNIQUE("username"),
    CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_idx" ON "User" USING btree ("username");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_idx" ON "User" USING btree ("email");
--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "User" USING btree ("role");
--> statement-breakpoint
CREATE TABLE "Conversation" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "user_id" integer NOT NULL,
    "title" varchar(200) NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "conversation_user_id_idx" ON "Conversation" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "conversation_created_at_idx" ON "Conversation" USING btree ("created_at");
--> statement-breakpoint
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE TABLE "Message" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "conversation_id" integer NOT NULL,
    "role" "message_role" NOT NULL,
    "content" text NOT NULL,
    "metadata" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "message_conversation_id_idx" ON "Message" USING btree ("conversation_id");
--> statement-breakpoint
CREATE INDEX "message_created_at_idx" ON "Message" USING btree ("created_at");
--> statement-breakpoint
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversation_id_Conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE cascade;
