CREATE TABLE `movies` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`director` varchar(255) NOT NULL,
	`release_year` smallint unsigned NOT NULL,
	`description` text NOT NULL,
	`poster_path` varchar(512) NOT NULL,
	`user_id` int unsigned NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `movies_id` PRIMARY KEY(`id`),
	CONSTRAINT `movies_release_year_min` CHECK(`movies`.`release_year` >= 1930)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`movie_id` int unsigned NOT NULL,
	`user_id` int unsigned NOT NULL,
	`rating` tinyint unsigned NOT NULL,
	`content` text NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviews_rating_range` CHECK(`reviews`.`rating` BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` char(64) NOT NULL,
	`user_id` int unsigned NOT NULL,
	`expires_at` datetime NOT NULL,
	CONSTRAINT `sessions_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`username` varchar(50) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
ALTER TABLE `movies` ADD CONSTRAINT `movies_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_movie_id_movies_id_fk` FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `reviews_movie_created_idx` ON `reviews` (`movie_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);