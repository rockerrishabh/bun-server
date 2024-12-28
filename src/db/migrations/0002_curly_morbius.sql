ALTER TABLE "user" ADD COLUMN "is_active" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "lastActive";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "updatedAt";