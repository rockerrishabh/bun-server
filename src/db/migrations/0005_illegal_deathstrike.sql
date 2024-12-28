CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text,
	"author_id" text,
	"post_id" text
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"author_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
