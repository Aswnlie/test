CREATE TABLE `google_accounts` (
	`subject` varchar(255) NOT NULL,
	`user_id` int unsigned NOT NULL,
	CONSTRAINT `google_accounts_subject` PRIMARY KEY(`subject`),
	CONSTRAINT `google_accounts_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `google_accounts` ADD CONSTRAINT `google_accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;