DELETE FROM `transactions` WHERE `approval_id` IN (
  SELECT a.id FROM `approvals` a
  JOIN `events` e ON e.id = a.event_id
  JOIN `github_identities` g ON g.user_id = e.user_id
  WHERE e.source = 'proactive_rule' AND lower(g.login) = 'yashserai'
);
--> statement-breakpoint
DELETE FROM `approvals` WHERE `event_id` IN (
  SELECT e.id FROM `events` e
  JOIN `github_identities` g ON g.user_id = e.user_id
  WHERE e.source = 'proactive_rule' AND lower(g.login) = 'yashserai'
);
--> statement-breakpoint
DELETE FROM `audit_events` WHERE `event_id` IN (
  SELECT e.id FROM `events` e
  JOIN `github_identities` g ON g.user_id = e.user_id
  WHERE e.source = 'proactive_rule' AND lower(g.login) = 'yashserai'
);
--> statement-breakpoint
DELETE FROM `candidates` WHERE `plan_id` IN (
  SELECT pp.id FROM `preparation_plans` pp
  JOIN `events` e ON e.id = pp.event_id
  JOIN `github_identities` g ON g.user_id = e.user_id
  WHERE e.source = 'proactive_rule' AND lower(g.login) = 'yashserai'
);
--> statement-breakpoint
DELETE FROM `preparation_plans` WHERE `event_id` IN (
  SELECT e.id FROM `events` e
  JOIN `github_identities` g ON g.user_id = e.user_id
  WHERE e.source = 'proactive_rule' AND lower(g.login) = 'yashserai'
);
--> statement-breakpoint
DELETE FROM `events` WHERE `source` = 'proactive_rule' AND `user_id` IN (
  SELECT g.user_id FROM `github_identities` g WHERE lower(g.login) = 'yashserai'
);
--> statement-breakpoint
PRAGMA optimize;
