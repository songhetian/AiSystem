DROP INDEX `approval_request_biz_type_biz_id_idx` ON `approval_request`;

CREATE UNIQUE INDEX `approval_request_biz_type_biz_id_key` ON `approval_request`(`biz_type`, `biz_id`);
