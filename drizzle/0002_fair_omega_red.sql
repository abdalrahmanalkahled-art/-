ALTER TABLE `events` MODIFY COLUMN `materialsUsed` json;--> statement-breakpoint
ALTER TABLE `events` MODIFY COLUMN `photos` json;--> statement-breakpoint
ALTER TABLE `signage_boards` MODIFY COLUMN `photos` json;--> statement-breakpoint
ALTER TABLE `stands` MODIFY COLUMN `photos` json;--> statement-breakpoint
ALTER TABLE `store_visits` MODIFY COLUMN `photos` json;--> statement-breakpoint
ALTER TABLE `stores` MODIFY COLUMN `photos` json;--> statement-breakpoint
ALTER TABLE `surveys` MODIFY COLUMN `companyProducts` json;--> statement-breakpoint
ALTER TABLE `surveys` MODIFY COLUMN `competitorProducts` json;--> statement-breakpoint
ALTER TABLE `surveys` MODIFY COLUMN `photos` json;