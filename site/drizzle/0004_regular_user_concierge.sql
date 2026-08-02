CREATE TABLE `task_details` (
  `event_id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `kind` text NOT NULL,
  `description` text,
  `action_state` text NOT NULL DEFAULT 'watching',
  `required_question` text,
  `answer` text,
  `location` text,
  `external_id` text,
  `source_url` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_details_user_external_idx` ON `task_details` (`user_id`,`external_id`) WHERE `external_id` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `task_details_user_state_idx` ON `task_details` (`user_id`,`action_state`,`updated_at`);
--> statement-breakpoint
CREATE TABLE `connection_syncs` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `provider` text NOT NULL,
  `connected_account_id` text,
  `last_synced_at` text,
  `last_error` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connection_syncs_user_provider_idx` ON `connection_syncs` (`user_id`,`provider`);
--> statement-breakpoint
CREATE TABLE `conversation_states` (
  `user_id` text PRIMARY KEY NOT NULL,
  `person_name` text,
  `intent` text,
  `missing_fields` text NOT NULL,
  `collected` text NOT NULL,
  `expires_at` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scheduled_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `rule_id` text,
  `run_key` text NOT NULL UNIQUE,
  `state` text NOT NULL,
  `detail` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`rule_id`) REFERENCES `proactive_rules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scheduled_runs_user_created_idx` ON `scheduled_runs` (`user_id`,`created_at`);
--> statement-breakpoint
PRAGMA optimize;
