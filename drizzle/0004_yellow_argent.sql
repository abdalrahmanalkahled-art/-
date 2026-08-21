CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`budgetPeriod` enum('monthly','quarterly','yearly') NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`totalBudget` float NOT NULL,
	`budgetCategory` enum('transport','travel','events','repairs','compensation','promotional','other','total') NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`eventDate` date NOT NULL,
	`location` varchar(255),
	`region` varchar(100),
	`budget` float DEFAULT 0,
	`actualCost` float DEFAULT 0,
	`materialsUsed` json,
	`giftsDistributed` int DEFAULT 0,
	`attendeesCount` int DEFAULT 0,
	`photos` json,
	`eventStatus` enum('planned','ongoing','completed','cancelled') NOT NULL DEFAULT 'planned',
	`rating` int,
	`salesImpact` text,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`amount` float NOT NULL,
	`expenseCategory` enum('transport','travel','events','repairs','compensation','promotional','other') NOT NULL,
	`expenseDate` date NOT NULL,
	`invoicePhoto` text,
	`relatedEventId` int,
	`relatedTaskId` int,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`goalPeriod` enum('monthly','quarterly','yearly') NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`kpi` varchar(255),
	`targetValue` float,
	`currentValue` float DEFAULT 0,
	`goalStatus` enum('pending','in_progress','completed','delayed') NOT NULL DEFAULT 'pending',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketing_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`goalId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`dueDate` date,
	`taskStatus` enum('pending','in_progress','completed','delayed') NOT NULL DEFAULT 'pending',
	`assignedTo` int,
	`completionPercentage` int DEFAULT 0,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketing_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prize_winners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(50),
	`region` varchar(100),
	`prizeType` varchar(255) NOT NULL,
	`receiveDate` date NOT NULL,
	`proofPhoto` text,
	`relatedEventId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prize_winners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signage_boards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location` varchar(255) NOT NULL,
	`boardType` enum('store','roadside','wall','island') NOT NULL,
	`installDate` date,
	`lastBrandChangeDate` date,
	`photos` json,
	`cost` float DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`relatedStoreId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signage_boards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serialNumber` varchar(100) NOT NULL,
	`currentStoreId` int,
	`standCondition` enum('excellent','good','fair','poor') NOT NULL DEFAULT 'good',
	`installDate` date,
	`photos` json,
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stands_id` PRIMARY KEY(`id`),
	CONSTRAINT `stands_serialNumber_unique` UNIQUE(`serialNumber`)
);
--> statement-breakpoint
CREATE TABLE `store_visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`visitDate` date NOT NULL,
	`notes` text,
	`photos` json,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `store_visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`ownerName` varchar(255),
	`phone` varchar(50),
	`region` varchar(100),
	`address` text,
	`category` varchar(100) NOT NULL DEFAULT 'عادي',
	`notes` text,
	`photos` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`surveyDate` date NOT NULL,
	`companyProducts` json,
	`competitorProducts` json,
	`overallPresencePercentage` float DEFAULT 0,
	`notes` text,
	`photos` json,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouse_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`warehouseCategory` enum('gifts','stands','boards','promotional','other') NOT NULL,
	`unit` varchar(50) DEFAULT 'قطعة',
	`currentQuantity` int NOT NULL DEFAULT 0,
	`minimumQuantity` int NOT NULL DEFAULT 5,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warehouse_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouse_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`movementType` enum('in','out') NOT NULL,
	`quantity` int NOT NULL,
	`relatedEventId` int,
	`relatedStoreId` int,
	`notes` text,
	`movementDate` date NOT NULL,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warehouse_movements_id` PRIMARY KEY(`id`)
);
