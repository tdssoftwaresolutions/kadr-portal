CREATE TABLE `mediator_court_case_trackers` (
  `id` CHAR(36) NOT NULL,
  `mediator_id` CHAR(36) NOT NULL,
  `cnr` VARCHAR(20) NOT NULL,
  `label` VARCHAR(120) NULL,
  `case_snapshot` JSON NULL,
  `last_fetched_at` DATETIME(0) NULL,
  `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_mediator_court_cnr`(`mediator_id`, `cnr`),
  INDEX `idx_court_tracker_mediator_updated`(`mediator_id`, `updated_at`),
  CONSTRAINT `fk_court_tracker_mediator` FOREIGN KEY (`mediator_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
