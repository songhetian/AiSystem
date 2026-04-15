-- 添加店铺排序字段
-- 创建时间: 2026-04-15

-- 添加 sort 字段到 biz_shop 表
ALTER TABLE `biz_shop` ADD COLUMN `sort` int NOT NULL DEFAULT 0;

-- 添加索引以优化排序查询
ALTER TABLE `biz_shop` ADD INDEX `biz_shop_sort_idx` (`sort`);
