ALTER TABLE `memory_facts` ADD `kind` text NOT NULL DEFAULT 'note';
--> statement-breakpoint
ALTER TABLE `memory_facts` ADD `value` text;
--> statement-breakpoint
ALTER TABLE `memory_facts` ADD `status` text NOT NULL DEFAULT 'confirmed';
--> statement-breakpoint
ALTER TABLE `memory_facts` ADD `origin` text NOT NULL DEFAULT 'seeded';
--> statement-breakpoint
ALTER TABLE `memory_facts` ADD `source_message_id` text;
--> statement-breakpoint
CREATE TABLE `concierge_profiles` (
  `user_id` text PRIMARY KEY NOT NULL, `phone_e164` text NOT NULL UNIQUE,
  `proactive_enabled` integer NOT NULL DEFAULT 1, `quiet_start_hour` integer NOT NULL DEFAULT 21,
  `quiet_end_hour` integer NOT NULL DEFAULT 8, `created_at` text NOT NULL, `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `conversations` (
  `id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `provider` text NOT NULL,
  `provider_chat_id` text NOT NULL UNIQUE, `participant_e164` text NOT NULL, `status` text NOT NULL,
  `created_at` text NOT NULL, `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `messages` (
  `id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `conversation_id` text NOT NULL,
  `provider_event_id` text UNIQUE, `provider_message_id` text, `direction` text NOT NULL, `body` text NOT NULL,
  `processing_state` text NOT NULL, `created_at` text NOT NULL, `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_user_created_idx` ON `messages` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `webhook_receipts` (`event_id` text PRIMARY KEY NOT NULL, `provider` text NOT NULL, `event_type` text NOT NULL, `received_at` text NOT NULL);
--> statement-breakpoint
CREATE TABLE `proactive_rules` (
  `id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `person_id` text NOT NULL, `kind` text NOT NULL,
  `cadence_days` integer NOT NULL, `maximum_amount_minor` integer NOT NULL, `currency` text NOT NULL,
  `enabled` integer NOT NULL DEFAULT 1, `next_eligible_at` text NOT NULL, `last_prepared_at` text,
  `created_at` text NOT NULL, `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `proactive_rules_due_idx` ON `proactive_rules` (`user_id`,`enabled`,`next_eligible_at`);
--> statement-breakpoint
CREATE TABLE `product_snapshots` (
  `id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `rule_id` text, `merchant` text NOT NULL,
  `merchant_product_id` text NOT NULL, `title` text NOT NULL, `amount_minor` integer NOT NULL,
  `currency` text NOT NULL, `url` text NOT NULL, `image_url` text, `availability` text NOT NULL,
  `source_kind` text NOT NULL, `evidence` text NOT NULL, `retrieved_at` text NOT NULL,
  `created_at` text NOT NULL, `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`rule_id`) REFERENCES `proactive_rules`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `product_snapshots_user_retrieved_idx` ON `product_snapshots` (`user_id`,`retrieved_at`);
