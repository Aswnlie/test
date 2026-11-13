ALTER TABLE `movies` DROP FOREIGN KEY `movies_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `reviews` DROP FOREIGN KEY `reviews_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `users` ADD `role` enum('user','admin') DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `movies` ADD CONSTRAINT `movies_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;