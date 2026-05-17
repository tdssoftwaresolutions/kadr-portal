ALTER TABLE `mediator_court_case_trackers`
  ADD COLUMN `case_number` VARCHAR(80) NULL AFTER `label`,
  ADD COLUMN `case_title` VARCHAR(500) NULL AFTER `case_number`,
  ADD COLUMN `court_name` VARCHAR(200) NULL AFTER `case_title`,
  ADD COLUMN `case_status` VARCHAR(64) NULL AFTER `court_name`;
