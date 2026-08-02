ALTER TABLE `users` ADD `onboarding_completed_at` text;
--> statement-breakpoint
CREATE TABLE `linq_pairings` (
  `user_id` text PRIMARY KEY NOT NULL,
  `phone_e164` text NOT NULL UNIQUE,
  `code_hash` text NOT NULL,
  `expires_at` integer NOT NULL,
  `verified_at` integer,
  `attempt_count` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `linq_pairings_phone_idx` ON `linq_pairings` (`phone_e164`,`expires_at`);
--> statement-breakpoint
DELETE FROM `transactions` WHERE `approval_id` IN (
  SELECT a.id FROM `approvals` a JOIN `events` e ON e.id = a.event_id
  JOIN `github_identities` g ON g.user_id = e.user_id
  WHERE e.source = 'seeded_fixture' AND lower(g.login) <> 'yashserai'
);
--> statement-breakpoint
DELETE FROM `approvals` WHERE `event_id` IN (
  SELECT e.id FROM `events` e JOIN `github_identities` g ON g.user_id = e.user_id
  WHERE e.source = 'seeded_fixture' AND lower(g.login) <> 'yashserai'
);
--> statement-breakpoint
DELETE FROM `audit_events` WHERE `event_id` IN (
  SELECT e.id FROM `events` e JOIN `github_identities` g ON g.user_id = e.user_id
  WHERE e.source = 'seeded_fixture' AND lower(g.login) <> 'yashserai'
);
--> statement-breakpoint
DELETE FROM `candidates` WHERE `plan_id` IN (
  SELECT pp.id FROM `preparation_plans` pp JOIN `events` e ON e.id = pp.event_id
  JOIN `github_identities` g ON g.user_id = e.user_id
  WHERE e.source = 'seeded_fixture' AND lower(g.login) <> 'yashserai'
);
--> statement-breakpoint
DELETE FROM `preparation_plans` WHERE `event_id` IN (
  SELECT e.id FROM `events` e JOIN `github_identities` g ON g.user_id = e.user_id
  WHERE e.source = 'seeded_fixture' AND lower(g.login) <> 'yashserai'
);
--> statement-breakpoint
DELETE FROM `memory_facts` WHERE `origin` = 'seeded' AND `user_id` IN (
  SELECT g.user_id FROM `github_identities` g WHERE lower(g.login) <> 'yashserai'
);
--> statement-breakpoint
DELETE FROM `events` WHERE `source` = 'seeded_fixture' AND `user_id` IN (
  SELECT g.user_id FROM `github_identities` g WHERE lower(g.login) <> 'yashserai'
);
--> statement-breakpoint
DELETE FROM `people` WHERE `user_id` IN (
  SELECT g.user_id FROM `github_identities` g WHERE lower(g.login) <> 'yashserai'
) AND NOT EXISTS (SELECT 1 FROM `memory_facts` mf WHERE mf.person_id = people.id)
  AND NOT EXISTS (SELECT 1 FROM `events` e WHERE e.person_id = people.id);
--> statement-breakpoint
PRAGMA optimize;
