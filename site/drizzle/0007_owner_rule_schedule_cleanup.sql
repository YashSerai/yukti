UPDATE `proactive_rules`
SET `enabled` = 1,
    `next_eligible_at` = datetime('now', '+26 days'),
    `updated_at` = datetime('now')
WHERE `kind` = 'recurring_flowers'
  AND `user_id` IN (
    SELECT g.user_id FROM `github_identities` g WHERE lower(g.login) = 'yashserai'
  );
--> statement-breakpoint
PRAGMA optimize;
