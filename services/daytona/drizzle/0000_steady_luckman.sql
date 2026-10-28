CREATE TABLE `race_players` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`seat` integer NOT NULL,
	`name` text NOT NULL,
	`secret` text NOT NULL,
	`ready` integer DEFAULT 0 NOT NULL,
	`connected` integer DEFAULT 0 NOT NULL,
	`cabinet` integer DEFAULT 0 NOT NULL,
	`seen` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `race_room_seat` ON `race_players` (`room`,`seat`);--> statement-breakpoint
CREATE INDEX `race_players_room` ON `race_players` (`room`);--> statement-breakpoint
CREATE TABLE `race_rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`phase` text NOT NULL,
	`match` text,
	`start_at` integer,
	`play_at` integer,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `race_signals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room` text NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`payload` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `race_signal_recipient` ON `race_signals` (`room`,`recipient`,`id`);