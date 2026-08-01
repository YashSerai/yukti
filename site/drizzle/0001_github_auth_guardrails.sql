CREATE TABLE `github_identities` (
  `provider_subject` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL UNIQUE,
  `login` text NOT NULL,
  `display_name` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `web_login_attempts` (
  `state_hash` text PRIMARY KEY NOT NULL,
  `code_verifier` text NOT NULL,
  `return_to` text NOT NULL,
  `expires_at` integer NOT NULL,
  `consumed_at` integer,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `web_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `token_hash` text NOT NULL,
  `expires_at` integer NOT NULL,
  `revoked_at` integer,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `web_sessions_expiry_idx` ON `web_sessions` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `rate_limits` (`key` text PRIMARY KEY NOT NULL, `attempt_count` integer NOT NULL, `window_expires_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `rate_limits_expiry_idx` ON `rate_limits` (`window_expires_at`);
