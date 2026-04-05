-- AiSystem MySQL schema initialization script
-- Compatible with MySQL 8.x
-- This file only creates table structures and comments.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `sys_user` (
  `id` varchar(191) NOT NULL COMMENT '鐢ㄦ埛涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '閫昏緫鍒犻櫎鏍囪锛? 鏈垹闄わ紝1 宸插垹闄?,
  `username` varchar(191) NOT NULL COMMENT '鐧诲綍鐢ㄦ埛鍚嶏紝绯荤粺鍐呭敮涓€',
  `password` varchar(191) NOT NULL COMMENT '鐧诲綍瀵嗙爜锛屽缓璁瓨鍌ㄥ搱甯屽€?,
  `name` varchar(191) NOT NULL COMMENT '鐢ㄦ埛濮撳悕鎴栨樉绀哄悕绉?,
  `phone` varchar(191) DEFAULT NULL COMMENT '鎵嬫満鍙?,
  `email` varchar(191) DEFAULT NULL COMMENT '閭鍦板潃',
  `status` int NOT NULL DEFAULT 1 COMMENT '鐢ㄦ埛鐘舵€侊紝1 鍚敤锛? 绂佺敤',
  `last_login_time` datetime(3) DEFAULT NULL COMMENT '鏈€杩戜竴娆＄櫥褰曟椂闂?,
  `platform_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞炲钩鍙?ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞為儴闂?ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞炲簵閾?ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_user_username_key` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='绯荤粺鐢ㄦ埛琛紝瀛樺偍鐧诲綍璐﹀彿涓庡熀纭€褰掑睘淇℃伅';

CREATE TABLE IF NOT EXISTS `sys_role` (
  `id` varchar(191) NOT NULL COMMENT '瑙掕壊涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '閫昏緫鍒犻櫎鏍囪锛? 鏈垹闄わ紝1 宸插垹闄?,
  `role_name` varchar(191) NOT NULL COMMENT '瑙掕壊鍚嶇О',
  `role_code` varchar(191) NOT NULL COMMENT '瑙掕壊缂栫爜锛岀郴缁熷唴鍞竴',
  `description` varchar(191) DEFAULT NULL COMMENT '瑙掕壊鎻忚堪',
  `status` int NOT NULL DEFAULT 1 COMMENT '瑙掕壊鐘舵€侊紝1 鍚敤锛? 绂佺敤',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_role_role_code_key` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='绯荤粺瑙掕壊琛紝瀹氫箟鏉冮檺瑙掕壊';

CREATE TABLE IF NOT EXISTS `sys_menu` (
  `id` varchar(191) NOT NULL COMMENT '鑿滃崟涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '閫昏緫鍒犻櫎鏍囪锛? 鏈垹闄わ紝1 宸插垹闄?,
  `menu_name` varchar(191) NOT NULL COMMENT '鑿滃崟鍚嶇О',
  `menu_code` varchar(191) NOT NULL COMMENT '鑿滃崟缂栫爜锛岀郴缁熷唴鍞竴',
  `parent_id` varchar(191) DEFAULT NULL COMMENT '鐖剁骇鑿滃崟 ID锛岀┖琛ㄧず椤剁骇鑿滃崟',
  `icon` varchar(191) DEFAULT NULL COMMENT '鑿滃崟鍥炬爣鏍囪瘑',
  `route` varchar(191) DEFAULT NULL COMMENT '鍓嶇璺敱鍦板潃锛岀郴缁熷唴鍞竴',
  `sort` int NOT NULL DEFAULT 0 COMMENT '鎺掑簭鍊硷紝瓒婂皬瓒婇潬鍓?,
  `type` int NOT NULL COMMENT '鑿滃崟绫诲瀷',
  `status` int NOT NULL DEFAULT 1 COMMENT '鑿滃崟鐘舵€侊紝1 鍚敤锛? 绂佺敤',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_menu_menu_code_key` (`menu_code`),
  UNIQUE KEY `sys_menu_route_key` (`route`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='绯荤粺鑿滃崟琛紝瀹氫箟瀵艰埅銆佺洰褰曚笌椤甸潰鏉冮檺鑺傜偣';

CREATE TABLE IF NOT EXISTS `sys_button` (
  `id` varchar(191) NOT NULL COMMENT '鎸夐挳涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '閫昏緫鍒犻櫎鏍囪锛? 鏈垹闄わ紝1 宸插垹闄?,
  `button_name` varchar(191) NOT NULL COMMENT '鎸夐挳鍚嶇О',
  `button_code` varchar(191) NOT NULL COMMENT '鎸夐挳缂栫爜锛岀郴缁熷唴鍞竴',
  `menu_id` varchar(191) NOT NULL COMMENT '鎵€灞炶彍鍗?ID',
  `status` int NOT NULL DEFAULT 1 COMMENT '鎸夐挳鐘舵€侊紝1 鍚敤锛? 绂佺敤',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_button_button_code_key` (`button_code`),
  KEY `sys_button_menu_id_idx` (`menu_id`),
  CONSTRAINT `sys_button_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `sys_menu` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='绯荤粺鎸夐挳琛紝瀹氫箟椤甸潰鎸夐挳绾ф潈闄?;

CREATE TABLE IF NOT EXISTS `sys_user_role` (
  `id` varchar(191) NOT NULL COMMENT '鍏宠仈涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `user_id` varchar(191) NOT NULL COMMENT '鐢ㄦ埛 ID',
  `role_id` varchar(191) NOT NULL COMMENT '瑙掕壊 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_user_role_user_id_role_id_key` (`user_id`, `role_id`),
  KEY `sys_user_role_role_id_idx` (`role_id`),
  CONSTRAINT `sys_user_role_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (`id`),
  CONSTRAINT `sys_user_role_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='鐢ㄦ埛涓庤鑹茬殑鍏宠仈鍏崇郴琛?;

CREATE TABLE IF NOT EXISTS `sys_role_menu` (
  `id` varchar(191) NOT NULL COMMENT '鍏宠仈涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `role_id` varchar(191) NOT NULL COMMENT '瑙掕壊 ID',
  `menu_id` varchar(191) NOT NULL COMMENT '鑿滃崟 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_role_menu_role_id_menu_id_key` (`role_id`, `menu_id`),
  KEY `sys_role_menu_menu_id_idx` (`menu_id`),
  CONSTRAINT `sys_role_menu_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (`id`),
  CONSTRAINT `sys_role_menu_menu_id_fkey` FOREIGN KEY (`menu_id`) REFERENCES `sys_menu` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='瑙掕壊涓庤彍鍗曠殑鍏宠仈鍏崇郴琛?;

CREATE TABLE IF NOT EXISTS `sys_role_button` (
  `id` varchar(191) NOT NULL COMMENT '鍏宠仈涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `role_id` varchar(191) NOT NULL COMMENT '瑙掕壊 ID',
  `button_id` varchar(191) NOT NULL COMMENT '鎸夐挳 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_role_button_role_id_button_id_key` (`role_id`, `button_id`),
  KEY `sys_role_button_button_id_idx` (`button_id`),
  CONSTRAINT `sys_role_button_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (`id`),
  CONSTRAINT `sys_role_button_button_id_fkey` FOREIGN KEY (`button_id`) REFERENCES `sys_button` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='瑙掕壊涓庢寜閽殑鍏宠仈鍏崇郴琛?;

CREATE TABLE IF NOT EXISTS `sys_api_permission` (
  `id` varchar(191) NOT NULL COMMENT '鎺ュ彛鏉冮檺涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '閫昏緫鍒犻櫎鏍囪锛? 鏈垹闄わ紝1 宸插垹闄?,
  `api_path` varchar(191) NOT NULL COMMENT '鎺ュ彛璺緞锛岀郴缁熷唴鍞竴',
  `request_method` varchar(191) NOT NULL COMMENT '璇锋眰鏂规硶锛屽 GET銆丳OST',
  `api_name` varchar(191) NOT NULL COMMENT '鎺ュ彛鍚嶇О',
  `role_ids` json NOT NULL COMMENT '鍙闂鑹?ID 鍒楄〃锛孞SON 鏁扮粍',
  `status` int NOT NULL DEFAULT 1 COMMENT '鎺ュ彛鐘舵€侊紝1 鍚敤锛? 绂佺敤',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞炲钩鍙?ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞為儴闂?ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞炲簵閾?ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sys_api_permission_api_path_key` (`api_path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='鎺ュ彛鏉冮檺琛紝瀹氫箟 API 涓庡彲璁块棶瑙掕壊鐨勬槧灏?;

CREATE TABLE IF NOT EXISTS `biz_platform` (
  `id` varchar(191) NOT NULL COMMENT '骞冲彴涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '閫昏緫鍒犻櫎鏍囪锛? 鏈垹闄わ紝1 宸插垹闄?,
  `name` varchar(191) NOT NULL COMMENT '骞冲彴鍚嶇О',
  `code` varchar(191) NOT NULL COMMENT '骞冲彴缂栫爜锛岀郴缁熷唴鍞竴',
  `description` varchar(191) DEFAULT NULL COMMENT '骞冲彴鎻忚堪',
  `status` int NOT NULL DEFAULT 1 COMMENT '骞冲彴鐘舵€侊紝1 鍚敤锛? 绂佺敤',
  `owner_id` varchar(191) DEFAULT NULL COMMENT '骞冲彴璐熻矗浜虹敤鎴?ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `biz_platform_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='骞冲彴琛紝鐢ㄤ簬绠＄悊澶氬钩鍙颁富浣?;

CREATE TABLE IF NOT EXISTS `biz_department` (
  `id` varchar(191) NOT NULL COMMENT '閮ㄩ棬涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '閫昏緫鍒犻櫎鏍囪锛? 鏈垹闄わ紝1 宸插垹闄?,
  `name` varchar(191) NOT NULL COMMENT '閮ㄩ棬鍚嶇О',
  `code` varchar(191) NOT NULL COMMENT '閮ㄩ棬缂栫爜锛岀郴缁熷唴鍞竴',
  `parent_id` varchar(191) DEFAULT NULL COMMENT '鐖剁骇閮ㄩ棬 ID锛岀┖琛ㄧず椤剁骇閮ㄩ棬',
  `sort` int NOT NULL DEFAULT 0 COMMENT '鎺掑簭鍊硷紝瓒婂皬瓒婇潬鍓?,
  `status` int NOT NULL DEFAULT 1 COMMENT '閮ㄩ棬鐘舵€侊紝1 鍚敤锛? 绂佺敤',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞炲钩鍙?ID',
  `owner_id` varchar(191) DEFAULT NULL COMMENT '閮ㄩ棬璐熻矗浜虹敤鎴?ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `biz_department_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='閮ㄩ棬琛紝鐢ㄤ簬缁勭粐鏋舵瀯绠＄悊';

CREATE TABLE IF NOT EXISTS `biz_shop` (
  `id` varchar(191) NOT NULL COMMENT '搴楅摵涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '閫昏緫鍒犻櫎鏍囪锛? 鏈垹闄わ紝1 宸插垹闄?,
  `name` varchar(191) NOT NULL COMMENT '搴楅摵鍚嶇О',
  `code` varchar(191) NOT NULL COMMENT '搴楅摵缂栫爜锛岀郴缁熷唴鍞竴',
  `type` int NOT NULL DEFAULT 1 COMMENT '搴楅摵绫诲瀷',
  `address` varchar(191) DEFAULT NULL COMMENT '搴楅摵鍦板潃',
  `phone` varchar(191) DEFAULT NULL COMMENT '搴楅摵鑱旂郴鐢佃瘽',
  `avatar` varchar(191) DEFAULT NULL COMMENT '搴楅摵澶村儚鎴栭棬搴楀浘鐗囧湴鍧€',
  `description` varchar(191) DEFAULT NULL COMMENT '搴楅摵鎻忚堪',
  `platform_id` varchar(191) NOT NULL COMMENT '鎵€灞炲钩鍙?ID',
  `department_id` varchar(191) NOT NULL COMMENT '鎵€灞為儴闂?ID',
  `owner_id` varchar(191) DEFAULT NULL COMMENT '搴楅摵璐熻矗浜虹敤鎴?ID',
  `status` int NOT NULL DEFAULT 1 COMMENT '搴楅摵鐘舵€侊紝1 鍚敤锛? 绂佺敤',
  PRIMARY KEY (`id`),
  UNIQUE KEY `biz_shop_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搴楅摵琛紝绠＄悊骞冲彴涓嬬殑闂ㄥ簵鎴栫粡钀ヤ富浣?;

CREATE TABLE IF NOT EXISTS `hr_position` (
  `id` varchar(191) NOT NULL COMMENT '宀椾綅涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '閫昏緫鍒犻櫎鏍囪锛? 鏈垹闄わ紝1 宸插垹闄?,
  `name` varchar(191) NOT NULL COMMENT '宀椾綅鍚嶇О',
  `code` varchar(191) NOT NULL COMMENT '宀椾綅缂栫爜锛岀郴缁熷唴鍞竴',
  `description` varchar(191) DEFAULT NULL COMMENT '宀椾綅鎻忚堪',
  `department_id` varchar(191) NOT NULL COMMENT '鎵€灞為儴闂?ID',
  `level` int DEFAULT NULL COMMENT '宀椾綅绾у埆',
  `sequence` varchar(191) DEFAULT NULL COMMENT '宀椾綅搴忓垪鎴栬亴绾у簭鍒?,
  `platform_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞炲钩鍙?ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `hr_position_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='宀椾綅琛紝瀹氫箟閮ㄩ棬涓嬬殑宀椾綅淇℃伅';

CREATE TABLE IF NOT EXISTS `hr_employee` (
  `id` varchar(191) NOT NULL COMMENT '鍛樺伐涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '閫昏緫鍒犻櫎鏍囪锛? 鏈垹闄わ紝1 宸插垹闄?,
  `name` varchar(191) NOT NULL COMMENT '鍛樺伐濮撳悕',
  `gender` int DEFAULT NULL COMMENT '鎬у埆',
  `age` int DEFAULT NULL COMMENT '骞撮緞',
  `phone` varchar(191) DEFAULT NULL COMMENT '鎵嬫満鍙?,
  `email` varchar(191) DEFAULT NULL COMMENT '閭鍦板潃',
  `employee_no` varchar(191) DEFAULT NULL COMMENT '鍛樺伐缂栧彿锛岀郴缁熷唴鍞竴',
  `job_no` varchar(191) DEFAULT NULL COMMENT '宸ュ彿锛岀郴缁熷唴鍞竴',
  `department_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞為儴闂?ID',
  `position_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞炲矖浣?ID',
  `user_id` varchar(191) DEFAULT NULL COMMENT '鍏宠仈鐢ㄦ埛 ID锛岀郴缁熷唴鍞竴',
  `manager_employee_id` varchar(191) DEFAULT NULL COMMENT '涓婄骇鍛樺伐 ID',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞炲钩鍙?ID',
  `status` int NOT NULL DEFAULT 1 COMMENT '鍛樺伐鐘舵€侊紝1 鍦ㄨ亴锛? 鍋滅敤鎴栫鑱?,
  `join_date` datetime(3) DEFAULT NULL COMMENT '鍏ヨ亴鏃ユ湡',
  `regularization_date` datetime(3) DEFAULT NULL COMMENT '杞鏃ユ湡',
  `contract_expire_time` datetime(3) DEFAULT NULL COMMENT '鍚堝悓鍒版湡鏃堕棿',
  `id_card_front_file` varchar(191) DEFAULT NULL COMMENT '韬唤璇佹闈㈡枃浠跺湴鍧€',
  `id_card_back_file` varchar(191) DEFAULT NULL COMMENT '韬唤璇佸弽闈㈡枃浠跺湴鍧€',
  `emergency_contact_name` varchar(191) DEFAULT NULL COMMENT '绱ф€ヨ仈绯讳汉濮撳悕',
  `emergency_contact_phone` varchar(191) DEFAULT NULL COMMENT '绱ф€ヨ仈绯讳汉鐢佃瘽',
  `household_registration` varchar(191) DEFAULT NULL COMMENT '鎴风睄淇℃伅',
  `political_status` varchar(191) DEFAULT NULL COMMENT '鏀挎不闈㈣矊',
  `education` varchar(191) DEFAULT NULL COMMENT '瀛﹀巻',
  `graduate_school` varchar(191) DEFAULT NULL COMMENT '姣曚笟闄㈡牎',
  `major` varchar(191) DEFAULT NULL COMMENT '涓撲笟',
  `social_security_base` decimal(10,2) DEFAULT NULL COMMENT '绀句繚鍩烘暟',
  `social_security_city` varchar(191) DEFAULT NULL COMMENT '绀句繚缂寸撼鍩庡競',
  PRIMARY KEY (`id`),
  UNIQUE KEY `hr_employee_employee_no_key` (`employee_no`),
  UNIQUE KEY `hr_employee_job_no_key` (`job_no`),
  UNIQUE KEY `hr_employee_user_id_key` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='鍛樺伐琛紝璁板綍浜轰簨妗ｆ涓庡叆鑱屼俊鎭?;

CREATE TABLE IF NOT EXISTS `attendance_rule` (
  `id` varchar(191) NOT NULL COMMENT '瑙勫垯涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '閫昏緫鍒犻櫎鏍囪锛? 鏈垹闄わ紝1 宸插垹闄?,
  `name` varchar(191) NOT NULL COMMENT '瑙勫垯鍚嶇О',
  `on_duty_time` varchar(191) NOT NULL COMMENT '涓婄彮鏃堕棿锛屽缓璁牸寮?HH:mm',
  `off_duty_time` varchar(191) NOT NULL COMMENT '涓嬬彮鏃堕棿锛屽缓璁牸寮?HH:mm',
  `late_threshold` int NOT NULL DEFAULT 0 COMMENT '杩熷埌闃堝€硷紝鍗曚綅鍒嗛挓',
  `early_threshold` int NOT NULL DEFAULT 0 COMMENT '鏃╅€€闃堝€硷紝鍗曚綅鍒嗛挓',
  `absenteeism_threshold` int NOT NULL DEFAULT 0 COMMENT '鏃峰伐闃堝€硷紝鍗曚綅鍒嗛挓',
  `status` int NOT NULL DEFAULT 1 COMMENT '瑙勫垯鐘舵€侊紝1 鍚敤锛? 绂佺敤',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞炲钩鍙?ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞為儴闂?ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='鑰冨嫟瑙勫垯琛紝瀹氫箟涓婁笅鐝鍒欎笌闃堝€?;

CREATE TABLE IF NOT EXISTS `attendance_schedule` (
  `id` varchar(191) NOT NULL COMMENT '鎺掔彮涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '閫昏緫鍒犻櫎鏍囪锛? 鏈垹闄わ紝1 宸插垹闄?,
  `employee_id` varchar(191) NOT NULL COMMENT '鍛樺伐 ID',
  `schedule_date` datetime(3) NOT NULL COMMENT '鎺掔彮鏃ユ湡',
  `shift_name` varchar(191) NOT NULL COMMENT '鐝鍚嶇О',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞炲钩鍙?ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞為儴闂?ID',
  PRIMARY KEY (`id`),
  KEY `attendance_schedule_employee_date_idx` (`employee_id`, `schedule_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='鎺掔彮琛紝瀹氫箟鍛樺伐鏌愬ぉ鐨勭彮娆″畨鎺?;

CREATE TABLE IF NOT EXISTS `attendance_record` (
  `id` varchar(191) NOT NULL COMMENT '鑰冨嫟璁板綍涓婚敭 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '鍒涘缓鏃堕棿',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '鏇存柊鏃堕棿',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '閫昏緫鍒犻櫎鏍囪锛? 鏈垹闄わ紝1 宸插垹闄?,
  `employee_id` varchar(191) NOT NULL COMMENT '鍛樺伐 ID',
  `attendance_date` datetime(3) NOT NULL COMMENT '鑰冨嫟鏃ユ湡',
  `schedule_id` varchar(191) DEFAULT NULL COMMENT '鍏宠仈鎺掔彮 ID',
  `shift_name` varchar(191) DEFAULT NULL COMMENT '鐝鍚嶇О',
  `scheduled_on_duty_time` varchar(191) DEFAULT NULL COMMENT '璁″垝涓婄彮鏃堕棿锛屽缓璁牸寮?HH:mm',
  `scheduled_off_duty_time` varchar(191) DEFAULT NULL COMMENT '璁″垝涓嬬彮鏃堕棿锛屽缓璁牸寮?HH:mm',
  `actual_on_duty_time` datetime(3) DEFAULT NULL COMMENT '瀹為檯涓婄彮鎵撳崱鏃堕棿',
  `actual_off_duty_time` datetime(3) DEFAULT NULL COMMENT '瀹為檯涓嬬彮鎵撳崱鏃堕棿',
  `on_duty_location` varchar(191) DEFAULT NULL COMMENT '涓婄彮鎵撳崱鍦扮偣',
  `off_duty_location` varchar(191) DEFAULT NULL COMMENT '涓嬬彮鎵撳崱鍦扮偣',
  `on_duty_status` int NOT NULL DEFAULT 0 COMMENT '涓婄彮鍑哄嫟鐘舵€?,
  `off_duty_status` int NOT NULL DEFAULT 0 COMMENT '涓嬬彮鍑哄嫟鐘舵€?,
  `work_duration_minutes` int DEFAULT NULL COMMENT '宸ヤ綔鏃堕暱锛屽崟浣嶅垎閽?,
  `exception_type` varchar(191) DEFAULT NULL COMMENT '寮傚父绫诲瀷',
  `remark` varchar(191) DEFAULT NULL COMMENT '澶囨敞',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞炲钩鍙?ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '鎵€灞為儴闂?ID',
  PRIMARY KEY (`id`),
  KEY `attendance_record_employee_date_idx` (`employee_id`, `attendance_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='鑰冨嫟璁板綍琛紝璁板綍鍛樺伐鎵撳崱涓庡嚭鍕ょ粨鏋?;

CREATE TABLE IF NOT EXISTS `attendance_leave` (
  `id` varchar(191) NOT NULL COMMENT '请假单主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `leave_no` varchar(191) NOT NULL COMMENT '请假单号，系统内唯一',
  `employee_id` varchar(191) NOT NULL COMMENT '员工 ID',
  `leave_type` varchar(191) NOT NULL COMMENT '请假类型',
  `start_time` datetime(3) NOT NULL COMMENT '请假开始时间',
  `end_time` datetime(3) NOT NULL COMMENT '请假结束时间',
  `duration_hours` decimal(10,2) DEFAULT NULL COMMENT '请假时长，单位小时',
  `reason` varchar(191) DEFAULT NULL COMMENT '请假原因',
  `approval_status` int NOT NULL DEFAULT 0 COMMENT '审批状态',
  `approved_by` varchar(191) DEFAULT NULL COMMENT '审批人 ID',
  `approved_time` datetime(3) DEFAULT NULL COMMENT '审批时间',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  `sync_attendance` int NOT NULL DEFAULT 0 COMMENT '是否同步考勤记录，0 否，1 是',
  `sync_schedule` int NOT NULL DEFAULT 0 COMMENT '是否同步排班，0 否，1 是',
  `approval_request_id` varchar(191) DEFAULT NULL COMMENT '关联审批单 ID',
  `approval_request_no` varchar(191) DEFAULT NULL COMMENT '关联审批单号',
  `attachment_urls` json DEFAULT NULL COMMENT '附件地址列表，JSON 数组',
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_leave_leave_no_key` (`leave_no`),
  KEY `attendance_leave_employee_start_idx` (`employee_id`, `start_time`),
  KEY `attendance_leave_approval_start_idx` (`approval_status`, `start_time`),
  KEY `attendance_leave_approval_request_id_idx` (`approval_request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='请假单表，记录员工请假申请与审批';

CREATE TABLE IF NOT EXISTS `attendance_overtime` (
  `id` varchar(191) NOT NULL COMMENT '加班单主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `overtime_no` varchar(191) NOT NULL COMMENT '加班单号，系统内唯一',
  `employee_id` varchar(191) NOT NULL COMMENT '员工 ID',
  `start_time` datetime(3) NOT NULL COMMENT '加班开始时间',
  `end_time` datetime(3) NOT NULL COMMENT '加班结束时间',
  `duration_hours` decimal(10,2) DEFAULT NULL COMMENT '加班时长，单位小时',
  `reason` varchar(191) DEFAULT NULL COMMENT '加班原因',
  `approval_status` int NOT NULL DEFAULT 0 COMMENT '审批状态',
  `approved_by` varchar(191) DEFAULT NULL COMMENT '审批人 ID',
  `approved_time` datetime(3) DEFAULT NULL COMMENT '审批时间',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  `sync_attendance` int NOT NULL DEFAULT 0 COMMENT '是否同步考勤记录，0 否，1 是',
  `sync_schedule` int NOT NULL DEFAULT 0 COMMENT '是否同步排班，0 否，1 是',
  `approval_request_id` varchar(191) DEFAULT NULL COMMENT '关联审批单 ID',
  `approval_request_no` varchar(191) DEFAULT NULL COMMENT '关联审批单号',
  `attachment_urls` json DEFAULT NULL COMMENT '附件地址列表，JSON 数组',
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_overtime_overtime_no_key` (`overtime_no`),
  KEY `attendance_overtime_employee_start_idx` (`employee_id`, `start_time`),
  KEY `attendance_overtime_approval_start_idx` (`approval_status`, `start_time`),
  KEY `attendance_overtime_approval_request_id_idx` (`approval_request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='加班单表，记录员工加班申请与审批';

CREATE TABLE IF NOT EXISTS `attendance_patch_card` (
  `id` varchar(191) NOT NULL COMMENT '补卡单主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `patch_no` varchar(191) NOT NULL COMMENT '补卡单号，系统内唯一',
  `employee_id` varchar(191) NOT NULL COMMENT '员工 ID',
  `patch_date` datetime(3) NOT NULL COMMENT '补卡日期',
  `patch_type` varchar(191) NOT NULL COMMENT '补卡类型',
  `target_time` datetime(3) NOT NULL COMMENT '目标补卡时间',
  `reason` varchar(191) DEFAULT NULL COMMENT '补卡原因',
  `approval_status` int NOT NULL DEFAULT 0 COMMENT '审批状态',
  `approved_by` varchar(191) DEFAULT NULL COMMENT '审批人 ID',
  `approved_time` datetime(3) DEFAULT NULL COMMENT '审批时间',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  `sync_attendance` int NOT NULL DEFAULT 0 COMMENT '是否同步考勤记录，0 否，1 是',
  `approval_request_id` varchar(191) DEFAULT NULL COMMENT '关联审批单 ID',
  `approval_request_no` varchar(191) DEFAULT NULL COMMENT '关联审批单号',
  `attachment_urls` json DEFAULT NULL COMMENT '附件地址列表，JSON 数组',
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_patch_card_patch_no_key` (`patch_no`),
  KEY `attendance_patch_card_employee_date_idx` (`employee_id`, `patch_date`),
  KEY `attendance_patch_card_approval_date_idx` (`approval_status`, `patch_date`),
  KEY `attendance_patch_card_approval_request_id_idx` (`approval_request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='补卡单表，记录员工补卡申请与审批';

CREATE TABLE IF NOT EXISTS `attendance_schedule_change` (
  `id` varchar(191) NOT NULL COMMENT '调班单主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `change_no` varchar(191) NOT NULL COMMENT '调班单号，系统内唯一',
  `employee_id` varchar(191) NOT NULL COMMENT '员工 ID',
  `change_date` datetime(3) NOT NULL COMMENT '调班日期',
  `before_shift_name` varchar(191) DEFAULT NULL COMMENT '调整前班次名称',
  `after_shift_name` varchar(191) DEFAULT NULL COMMENT '调整后班次名称',
  `change_type` varchar(191) NOT NULL COMMENT '调班类型',
  `reason` varchar(191) DEFAULT NULL COMMENT '调班原因',
  `operator_id` varchar(191) DEFAULT NULL COMMENT '操作人 ID',
  `notify_status` int NOT NULL DEFAULT 0 COMMENT '通知状态',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_schedule_change_change_no_key` (`change_no`),
  KEY `attendance_schedule_change_employee_date_idx` (`employee_id`, `change_date`),
  KEY `attendance_schedule_change_notify_date_idx` (`notify_status`, `change_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='调班单表，记录班次调整申请与结果';

CREATE TABLE IF NOT EXISTS `approval_template` (
  `id` varchar(191) NOT NULL COMMENT '审批模板主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `name` varchar(191) NOT NULL COMMENT '模板名称',
  `type` varchar(191) NOT NULL COMMENT '模板类型',
  `platform_name` varchar(191) NOT NULL COMMENT '平台名称',
  `department_name` varchar(191) NOT NULL COMMENT '部门名称',
  `status` varchar(191) NOT NULL COMMENT '模板状态',
  `description` text DEFAULT NULL COMMENT '模板描述',
  `updated_at` varchar(191) NOT NULL COMMENT '前端更新时间',
  `nodes` json NOT NULL COMMENT '模板节点 JSON',
  PRIMARY KEY (`id`),
  KEY `approval_template_status_update_time_idx` (`status`, `update_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批模板表';

CREATE TABLE IF NOT EXISTS `approval_request` (
  `id` varchar(191) NOT NULL COMMENT '审批单主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `request_no` varchar(191) NOT NULL COMMENT '审批单号',
  `template_id` varchar(191) NOT NULL COMMENT '模板 ID',
  `template_name` varchar(191) NOT NULL COMMENT '模板名称',
  `biz_type` varchar(191) DEFAULT NULL COMMENT '关联业务类型',
  `biz_id` varchar(191) DEFAULT NULL COMMENT '关联业务 ID',
  `type` varchar(191) NOT NULL COMMENT '审批类型',
  `applicant_id` varchar(191) NOT NULL COMMENT '申请人 ID',
  `applicant_name` varchar(191) NOT NULL COMMENT '申请人名称',
  `current_approver_id` varchar(191) DEFAULT NULL COMMENT '当前审批人 ID',
  `current_approver_name` varchar(191) DEFAULT NULL COMMENT '当前审批人名称',
  `status` varchar(191) NOT NULL COMMENT '审批状态',
  `amount` decimal(10,2) DEFAULT NULL COMMENT '金额',
  `platform_name` varchar(191) NOT NULL COMMENT '平台名称',
  `department_name` varchar(191) NOT NULL COMMENT '部门名称',
  `summary` text NOT NULL COMMENT '审批摘要',
  `created_at` varchar(191) NOT NULL COMMENT '前端创建时间',
  `updated_at` varchar(191) NOT NULL COMMENT '前端更新时间',
  `progress` json NOT NULL COMMENT '审批进度 JSON',
  PRIMARY KEY (`id`),
  UNIQUE KEY `approval_request_request_no_key` (`request_no`),
  UNIQUE KEY `approval_request_biz_type_biz_id_key` (`biz_type`, `biz_id`),
  KEY `approval_request_status_update_time_idx` (`status`, `update_time`),
  KEY `approval_request_applicant_id_update_time_idx` (`applicant_id`, `update_time`),
  KEY `approval_request_current_approver_id_update_time_idx` (`current_approver_id`, `update_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批单表';

CREATE TABLE IF NOT EXISTS `approval_event` (
  `id` varchar(191) NOT NULL COMMENT '审批事件主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `request_id` varchar(191) NOT NULL COMMENT '审批单 ID',
  `request_no` varchar(191) NOT NULL COMMENT '审批单号',
  `biz_type` varchar(191) DEFAULT NULL COMMENT '业务类型',
  `biz_id` varchar(191) DEFAULT NULL COMMENT '业务 ID',
  `event_type` varchar(191) NOT NULL COMMENT '事件类型',
  `event_source` varchar(191) NOT NULL COMMENT '事件来源',
  `request_status_from` varchar(191) DEFAULT NULL COMMENT '审批状态变更前',
  `request_status_to` varchar(191) DEFAULT NULL COMMENT '审批状态变更后',
  `biz_status_from` int DEFAULT NULL COMMENT '业务状态变更前',
  `biz_status_to` int DEFAULT NULL COMMENT '业务状态变更后',
  `operator_id` varchar(191) DEFAULT NULL COMMENT '操作人 ID',
  `operator_name` varchar(191) DEFAULT NULL COMMENT '操作人名称',
  `dedup_key` varchar(191) DEFAULT NULL COMMENT '去重键',
  `external_event_id` varchar(191) DEFAULT NULL COMMENT '外部事件 ID',
  `payload` json DEFAULT NULL COMMENT '事件原始载荷',
  PRIMARY KEY (`id`),
  UNIQUE KEY `approval_event_dedup_key_key` (`dedup_key`),
  KEY `approval_event_request_id_create_time_idx` (`request_id`, `create_time`),
  KEY `approval_event_request_no_create_time_idx` (`request_no`, `create_time`),
  KEY `approval_event_event_type_create_time_idx` (`event_type`, `create_time`),
  KEY `approval_event_event_source_create_time_idx` (`event_source`, `create_time`),
  KEY `approval_event_biz_type_biz_id_create_time_idx` (`biz_type`, `biz_id`, `create_time`),
  KEY `approval_event_external_event_id_idx` (`external_event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批事件审计表';

CREATE TABLE IF NOT EXISTS `sys_message` (
  `id` varchar(191) NOT NULL COMMENT '站内消息主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
  `recipient_id` varchar(191) NOT NULL COMMENT '接收人 ID',
  `title` varchar(191) NOT NULL COMMENT '消息标题',
  `content` text NOT NULL COMMENT '消息内容',
  `message_type` varchar(191) NOT NULL COMMENT '消息类型',
  `biz_type` varchar(191) DEFAULT NULL COMMENT '关联业务类型',
  `biz_id` varchar(191) DEFAULT NULL COMMENT '关联业务 ID',
  `route` varchar(191) DEFAULT NULL COMMENT '前端跳转路径',
  `read_status` int NOT NULL DEFAULT 0 COMMENT '是否已读',
  `read_time` datetime(3) DEFAULT NULL COMMENT '已读时间',
  `sender_id` varchar(191) DEFAULT NULL COMMENT '发送人 ID',
  `sender_name` varchar(191) DEFAULT NULL COMMENT '发送人名称',
  `payload` json DEFAULT NULL COMMENT '消息扩展载荷',
  PRIMARY KEY (`id`),
  KEY `sys_message_recipient_id_read_status_create_time_idx` (`recipient_id`, `read_status`, `create_time`),
  KEY `sys_message_message_type_create_time_idx` (`message_type`, `create_time`),
  KEY `sys_message_biz_type_biz_id_create_time_idx` (`biz_type`, `biz_id`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站内消息表';

CREATE TABLE IF NOT EXISTS `sys_login_log` (
  `id` varchar(191) NOT NULL COMMENT '日志主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `user_id` varchar(191) DEFAULT NULL COMMENT '用户 ID',
  `username` varchar(191) NOT NULL COMMENT '登录用户名',
  `login_ip` varchar(191) DEFAULT NULL COMMENT '登录 IP',
  `user_agent` varchar(512) DEFAULT NULL COMMENT '用户代理',
  `login_status` int NOT NULL DEFAULT 1 COMMENT '登录状态，1 成功，0 失败',
  `login_message` varchar(191) DEFAULT NULL COMMENT '登录结果说明',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '所属店铺 ID',
  PRIMARY KEY (`id`),
  KEY `sys_login_log_username_create_idx` (`username`, `create_time`),
  KEY `sys_login_log_status_create_idx` (`login_status`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='登录日志表，记录用户登录结果与终端信息';

CREATE TABLE IF NOT EXISTS `sys_operation_log` (
  `id` varchar(191) NOT NULL COMMENT '日志主键 ID',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `is_deleted` int NOT NULL DEFAULT 0 COMMENT '逻辑删除标记，0 未删除，1 已删除',
  `user_id` varchar(191) DEFAULT NULL COMMENT '用户 ID',
  `username` varchar(191) DEFAULT NULL COMMENT '操作用户名',
  `request_method` varchar(32) NOT NULL COMMENT '请求方法',
  `api_path` varchar(191) NOT NULL COMMENT '接口路径',
  `api_name` varchar(191) DEFAULT NULL COMMENT '权限编码或接口名称',
  `operation_module` varchar(191) DEFAULT NULL COMMENT '操作模块',
  `request_ip` varchar(191) DEFAULT NULL COMMENT '请求 IP',
  `user_agent` varchar(512) DEFAULT NULL COMMENT '用户代理',
  `operation_status` int NOT NULL DEFAULT 1 COMMENT '操作状态，1 成功，0 失败',
  `operation_message` varchar(191) DEFAULT NULL COMMENT '操作结果说明',
  `request_params` json DEFAULT NULL COMMENT '请求参数摘要',
  `response_summary` json DEFAULT NULL COMMENT '响应摘要',
  `platform_id` varchar(191) DEFAULT NULL COMMENT '所属平台 ID',
  `dept_id` varchar(191) DEFAULT NULL COMMENT '所属部门 ID',
  `shop_id` varchar(191) DEFAULT NULL COMMENT '所属店铺 ID',
  PRIMARY KEY (`id`),
  KEY `sys_operation_log_user_create_idx` (`user_id`, `create_time`),
  KEY `sys_operation_log_module_create_idx` (`operation_module`, `create_time`),
  KEY `sys_operation_log_status_create_idx` (`operation_status`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表，记录接口级操作行为';

SET FOREIGN_KEY_CHECKS = 1;
