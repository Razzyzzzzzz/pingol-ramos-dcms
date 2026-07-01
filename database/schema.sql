-- =============================================================================
-- Pingol Ramos Dental Clinic — Management System
-- Database Schema (MySQL 5.7+ / 8.0 / MariaDB 10.4+)
-- Engine: InnoDB   Charset: utf8mb4
--
-- Import order:  1) schema.sql   2) seed.sql   3) run backend/setup.php once
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `pingol_ramos_dcms`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `pingol_ramos_dcms`;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- users — login accounts (admin / dentist / staff), role-based access
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(120) NOT NULL,
  `email`         VARCHAR(160) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          ENUM('admin','dentist','staff') NOT NULL DEFAULT 'staff',
  `phone`         VARCHAR(40)  DEFAULT NULL,
  `avatar`        VARCHAR(255) DEFAULT NULL,
  `status`        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- password_resets — forgot-password tokens
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email`      VARCHAR(160) NOT NULL,
  `token`      VARCHAR(120) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used`       TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pwreset_email` (`email`),
  KEY `idx_pwreset_token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- dentists — clinic dentists selectable when booking
-- (optionally linked to a login user via user_id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `dentists` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`        INT UNSIGNED DEFAULT NULL,
  `name`           VARCHAR(120) NOT NULL,
  `specialization` VARCHAR(120) DEFAULT NULL,
  `phone`          VARCHAR(40)  DEFAULT NULL,
  `email`          VARCHAR(160) DEFAULT NULL,
  `status`         ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dentists_user` (`user_id`),
  CONSTRAINT `fk_dentists_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- services — treatments / services offered (used at booking time)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `services` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`             VARCHAR(120) NOT NULL,
  `description`      VARCHAR(255) DEFAULT NULL,
  `price`            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `duration_minutes` INT NOT NULL DEFAULT 30,
  `status`           ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_services_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- suppliers — inventory suppliers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(120) NOT NULL,
  `contact_person` VARCHAR(120) DEFAULT NULL,
  `phone`          VARCHAR(40)  DEFAULT NULL,
  `email`          VARCHAR(160) DEFAULT NULL,
  `address`        VARCHAR(255) DEFAULT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- patients — patient master record
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `patients` (
  `id`                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `patient_code`             VARCHAR(20)  NOT NULL,
  `first_name`               VARCHAR(80)  NOT NULL,
  `last_name`                VARCHAR(80)  NOT NULL,
  `birthdate`                DATE         DEFAULT NULL,
  `gender`                   ENUM('male','female','other') DEFAULT NULL,
  `address`                  VARCHAR(255) DEFAULT NULL,
  `contact_number`           VARCHAR(40)  DEFAULT NULL,
  `email`                    VARCHAR(160) DEFAULT NULL,
  `medical_history`          TEXT         DEFAULT NULL,
  `allergies`                TEXT         DEFAULT NULL,
  `existing_conditions`      TEXT         DEFAULT NULL,
  `emergency_contact_name`   VARCHAR(120) DEFAULT NULL,
  `emergency_contact_number` VARCHAR(40)  DEFAULT NULL,
  `created_by`               INT UNSIGNED DEFAULT NULL,
  `created_at`               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_patients_code` (`patient_code`),
  KEY `idx_patients_name` (`last_name`,`first_name`),
  KEY `idx_patients_contact` (`contact_number`),
  CONSTRAINT `fk_patients_creator` FOREIGN KEY (`created_by`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- appointments — booked appointments
-- Double-booking is enforced in the API (dentist + date + start_time,
-- ignoring cancelled slots). Index below backs that lookup.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `appointments` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `appointment_code` VARCHAR(20)  NOT NULL,
  `patient_id`       INT UNSIGNED NOT NULL,
  `dentist_id`       INT UNSIGNED DEFAULT NULL,
  `service_id`       INT UNSIGNED DEFAULT NULL,
  `appointment_date` DATE NOT NULL,
  `start_time`       TIME NOT NULL,
  `end_time`         TIME DEFAULT NULL,
  `status`           ENUM('pending','approved','completed','cancelled') NOT NULL DEFAULT 'pending',
  `notes`            TEXT DEFAULT NULL,
  `created_by`       INT UNSIGNED DEFAULT NULL,
  `created_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_appt_code` (`appointment_code`),
  KEY `idx_appt_slot` (`dentist_id`,`appointment_date`,`start_time`),
  KEY `idx_appt_date` (`appointment_date`),
  KEY `idx_appt_status` (`status`),
  KEY `idx_appt_patient` (`patient_id`),
  CONSTRAINT `fk_appt_patient` FOREIGN KEY (`patient_id`)
    REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_appt_dentist` FOREIGN KEY (`dentist_id`)
    REFERENCES `dentists` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_appt_service` FOREIGN KEY (`service_id`)
    REFERENCES `services` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_appt_creator` FOREIGN KEY (`created_by`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- treatments — dental records: procedures, diagnoses, prescriptions per patient
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `treatments` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `patient_id`     INT UNSIGNED NOT NULL,
  `appointment_id` INT UNSIGNED DEFAULT NULL,
  `dentist_id`     INT UNSIGNED DEFAULT NULL,
  `treatment_name` VARCHAR(160) NOT NULL,
  `tooth_number`   VARCHAR(20)  DEFAULT NULL,
  `diagnosis`      TEXT DEFAULT NULL,
  `procedure_notes`TEXT DEFAULT NULL,
  `prescription`   TEXT DEFAULT NULL,
  `cost`           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `treatment_date` DATE NOT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_treat_patient` (`patient_id`),
  KEY `idx_treat_date` (`treatment_date`),
  CONSTRAINT `fk_treat_patient` FOREIGN KEY (`patient_id`)
    REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_treat_appt` FOREIGN KEY (`appointment_id`)
    REFERENCES `appointments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_treat_dentist` FOREIGN KEY (`dentist_id`)
    REFERENCES `dentists` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- dental_records — uploaded files: x-rays, lab results, documents, prescriptions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `dental_records` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `patient_id`  INT UNSIGNED NOT NULL,
  `title`       VARCHAR(160) NOT NULL,
  `category`    ENUM('xray','lab_result','document','prescription','other') NOT NULL DEFAULT 'document',
  `file_name`   VARCHAR(255) NOT NULL,
  `file_path`   VARCHAR(255) NOT NULL,
  `file_type`   VARCHAR(120) DEFAULT NULL,
  `file_size`   INT UNSIGNED DEFAULT 0,
  `notes`       TEXT DEFAULT NULL,
  `uploaded_by` INT UNSIGNED DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_records_patient` (`patient_id`),
  KEY `idx_records_category` (`category`),
  CONSTRAINT `fk_records_patient` FOREIGN KEY (`patient_id`)
    REFERENCES `patients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_records_uploader` FOREIGN KEY (`uploaded_by`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- inventory — clinic supplies / stock
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_name`   VARCHAR(160) NOT NULL,
  `category`       VARCHAR(120) DEFAULT NULL,
  `quantity`       INT NOT NULL DEFAULT 0,
  `unit`           VARCHAR(40)  DEFAULT 'pcs',
  `reorder_level`  INT NOT NULL DEFAULT 10,
  `purchase_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `selling_price`  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `supplier_id`    INT UNSIGNED DEFAULT NULL,
  `expiration_date`DATE DEFAULT NULL,
  `status`         ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inv_category` (`category`),
  KEY `idx_inv_supplier` (`supplier_id`),
  CONSTRAINT `fk_inv_supplier` FOREIGN KEY (`supplier_id`)
    REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- expenses — clinic operating expenses
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `expenses` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category`     ENUM('equipment','supplies','utilities','rent','salaries','maintenance','other') NOT NULL DEFAULT 'other',
  `title`        VARCHAR(160) NOT NULL,
  `amount`       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `expense_date` DATE NOT NULL,
  `notes`        TEXT DEFAULT NULL,
  `created_by`   INT UNSIGNED DEFAULT NULL,
  `created_at`   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_exp_category` (`category`),
  KEY `idx_exp_date` (`expense_date`),
  CONSTRAINT `fk_exp_creator` FOREIGN KEY (`created_by`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payments — revenue records (drives revenue reporting)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `patient_id`     INT UNSIGNED DEFAULT NULL,
  `appointment_id` INT UNSIGNED DEFAULT NULL,
  `amount`         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('cash','card','gcash','bank_transfer','other') NOT NULL DEFAULT 'cash',
  `payment_date`   DATE NOT NULL,
  `description`    VARCHAR(255) DEFAULT NULL,
  `created_by`     INT UNSIGNED DEFAULT NULL,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pay_date` (`payment_date`),
  KEY `idx_pay_patient` (`patient_id`),
  CONSTRAINT `fk_pay_patient` FOREIGN KEY (`patient_id`)
    REFERENCES `patients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pay_appt` FOREIGN KEY (`appointment_id`)
    REFERENCES `appointments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_pay_creator` FOREIGN KEY (`created_by`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- notifications — in-app notifications (user_id NULL = broadcast to admins)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED DEFAULT NULL,
  `type`       VARCHAR(60) NOT NULL DEFAULT 'system',
  `title`      VARCHAR(160) NOT NULL,
  `message`    VARCHAR(255) DEFAULT NULL,
  `link`       VARCHAR(160) DEFAULT NULL,
  `is_read`    TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user` (`user_id`),
  KEY `idx_notif_read` (`is_read`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- chatbot_logs — assistant conversation history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chatbot_logs` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED DEFAULT NULL,
  `message`    TEXT NOT NULL,
  `response`   TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chat_user` (`user_id`),
  CONSTRAINT `fk_chat_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- settings — clinic info + system preferences (key/value)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key`   VARCHAR(80)  NOT NULL,
  `setting_value` TEXT DEFAULT NULL,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_settings_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
