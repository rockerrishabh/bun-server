ALTER TABLE "verificationToken" DROP CONSTRAINT "verificationToken_identifier_unique";--> statement-breakpoint
ALTER TABLE "passwordResetToken" DROP CONSTRAINT "passwordResetToken_userId_token_pk";--> statement-breakpoint
ALTER TABLE "verificationToken" ADD COLUMN "userId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "verificationToken" ADD CONSTRAINT "verificationToken_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verificationToken" DROP COLUMN "identifier";