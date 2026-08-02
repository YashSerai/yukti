DELETE FROM `transactions` WHERE `approval_id` IN (
  SELECT a.id
  FROM `approvals` a
  JOIN `github_identities` g ON g.user_id = a.user_id
  WHERE lower(g.login) = 'yashserai'
);
--> statement-breakpoint
DELETE FROM `approvals` WHERE `user_id` IN (
  SELECT g.user_id FROM `github_identities` g WHERE lower(g.login) = 'yashserai'
);
--> statement-breakpoint
DELETE FROM `audit_events` WHERE `user_id` IN (
  SELECT g.user_id FROM `github_identities` g WHERE lower(g.login) = 'yashserai'
) AND `kind` IN ('approval.created', 'payment.sandbox_result', 'linq.reply_failed');
--> statement-breakpoint
PRAGMA optimize;
