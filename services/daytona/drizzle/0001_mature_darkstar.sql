CREATE TABLE `journal_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`record_id` integer NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`content` text NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	`deleted` integer
);
--> statement-breakpoint
CREATE INDEX `journal_comment_record` ON `journal_comments` (`record_id`,`deleted`,`id`);--> statement-breakpoint
CREATE INDEX `journal_comment_owner` ON `journal_comments` (`owner`,`id`);--> statement-breakpoint
CREATE TABLE `journal_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`course` text NOT NULL,
	`kind` text NOT NULL,
	`time_ms` integer,
	`content` text NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	`deleted` integer
);
--> statement-breakpoint
CREATE INDEX `journal_record_feed` ON `journal_records` (`deleted`,`id`);--> statement-breakpoint
CREATE INDEX `journal_record_owner` ON `journal_records` (`owner`,`id`);--> statement-breakpoint
CREATE TABLE `journal_writers` (
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`name` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_writer_secret` ON `journal_writers` (`secret`);--> statement-breakpoint
CREATE INDEX `journal_writer_created` ON `journal_writers` (`created`);