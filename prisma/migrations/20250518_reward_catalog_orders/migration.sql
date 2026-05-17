-- Reward catalog and redemption orders

CREATE TABLE `reward_catalog_items` (
  `id` CHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `points_cost` INT NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  INDEX `idx_reward_catalog_active_sort`(`active`, `sort_order`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `reward_redemption_orders` (
  `id` CHAR(36) NOT NULL,
  `mediator_id` CHAR(36) NOT NULL,
  `catalog_item_id` CHAR(36) NOT NULL,
  `points_spent` INT NOT NULL,
  `status` ENUM('PENDING', 'FULFILLED') NOT NULL DEFAULT 'PENDING',
  `admin_notes` TEXT NULL,
  `fulfilled_at` DATETIME(0) NULL,
  `fulfilled_by` CHAR(36) NULL,
  `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  INDEX `idx_reward_order_mediator_created`(`mediator_id`, `created_at`),
  INDEX `idx_reward_order_status_created`(`status`, `created_at`),
  CONSTRAINT `fk_reward_order_mediator` FOREIGN KEY (`mediator_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_reward_order_catalog` FOREIGN KEY (`catalog_item_id`) REFERENCES `reward_catalog_items`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
