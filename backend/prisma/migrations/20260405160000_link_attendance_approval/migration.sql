ALTER TABLE `attendance_leave`
  ADD COLUMN `approval_request_id` varchar(191) NULL,
  ADD COLUMN `approval_request_no` varchar(191) NULL,
  ADD INDEX `attendance_leave_approval_request_id_idx`(`approval_request_id`);

ALTER TABLE `attendance_overtime`
  ADD COLUMN `approval_request_id` varchar(191) NULL,
  ADD COLUMN `approval_request_no` varchar(191) NULL,
  ADD INDEX `attendance_overtime_approval_request_id_idx`(`approval_request_id`);

ALTER TABLE `attendance_patch_card`
  ADD COLUMN `approval_request_id` varchar(191) NULL,
  ADD COLUMN `approval_request_no` varchar(191) NULL,
  ADD INDEX `attendance_patch_card_approval_request_id_idx`(`approval_request_id`);

ALTER TABLE `approval_request`
  ADD COLUMN `biz_type` varchar(191) NULL,
  ADD COLUMN `biz_id` varchar(191) NULL,
  ADD INDEX `approval_request_biz_type_biz_id_idx`(`biz_type`, `biz_id`);
