# 前端工具类使用指南

## 📋 概述

本目录包含前端所有工具类和辅助函数，提供统一的请求封装、数据处理、格式化等功能。

## 🚀 快速开始

### 1. API请求

#### 1.1 基础请求

```typescript
import { get, post, put, del } from "@/utils/request";

// GET请求
const getUserList = async (params: any) => {
  const data = await get("/api/v1/users", params);
  return data;
};

// POST请求
const createUser = async (userData: any) => {
  const data = await post("/api/v1/users", userData, {
    showSuccess: true, // 显示成功提示
  });
  return data;
};

// PUT请求
const updateUser = async (id: string, userData: any) => {
  const data = await put(`/api/v1/users/${id}`, userData, {
    showSuccess: true,
  });
  return data;
};

// DELETE请求
const deleteUser = async (id: string) => {
  const data = await del(`/api/v1/users/${id}`, undefined, {
    showSuccess: true,
  });
  return data;
};
```

#### 1.2 防重放请求

```typescript
import { post } from "@/utils/request";

// 支付等敏感操作启用防重放
const submitPayment = async (paymentData: any) => {
  const data = await post("/api/v1/payment/submit", paymentData, {
    antiReplay: true, // 启用防重放
    showLoading: true, // 显示加载状态
    showSuccess: true, // 显示成功提示
  });
  return data;
};
```

#### 1.3 文件上传

```typescript
import { upload } from "@/utils/request";

const uploadFile = async (file: File) => {
  const data = await upload(
    "/api/v1/upload",
    file,
    (percent) => {
      console.log(`上传进度: ${percent}%`);
    },
    {
      showLoading: true,
    },
  );
  return data;
};
```

#### 1.4 文件下载

```typescript
import { download } from "@/utils/request";

const downloadReport = async (reportId: string) => {
  await download(
    "/api/v1/reports/export",
    `report_${reportId}.xlsx`,
    { id: reportId },
    {
      showLoading: true,
    },
  );
};
```

#### 1.5 跳过错误处理

```typescript
import { get } from "@/utils/request";

// 某些场景需要自定义错误处理
const checkUserExists = async (username: string) => {
  try {
    const data = await get(
      "/api/v1/users/check",
      { username },
      { skipErrorHandler: true }, // 跳过全局错误处理
    );
    return data;
  } catch (error) {
    // 自定义错误处理
    console.log("用户不存在");
    return false;
  }
};
```

### 2. 请求配置

#### 2.1 配置选项

```typescript
interface RequestConfig {
  skipErrorHandler?: boolean; // 跳过错误处理
  skipAuth?: boolean; // 跳过认证（不添加Token）
  antiReplay?: boolean; // 启用防重放
  showLoading?: boolean; // 显示加载状态
  showSuccess?: boolean; // 显示成功提示
}
```

#### 2.2 使用示例

```typescript
// 公开接口，不需要认证
const getPublicData = async () => {
  const data = await get("/api/v1/public/data", undefined, {
    skipAuth: true, // 不添加Token
  });
  return data;
};

// 敏感操作，需要防重放和加载提示
const sensitiveOperation = async (data: any) => {
  const result = await post("/api/v1/sensitive", data, {
    antiReplay: true, // 防重放
    showLoading: true, // 显示加载
    showSuccess: true, // 显示成功提示
  });
  return result;
};
```

### 3. 响应格式

#### 3.1 标准响应

所有接口返回标准格式：

```typescript
interface ApiResponse<T> {
  code: number; // 状态码
  message: string; // 提示信息
  data: T; // 响应数据
  timestamp?: string; // 时间戳
  path?: string; // 请求路径
}
```

#### 3.2 使用示例

```typescript
// 请求会自动解析，直接返回data部分
const users = await get<User[]>("/api/v1/users");
// users 的类型是 User[]，不是 ApiResponse<User[]>

// 如果需要完整响应，可以这样：
import request from "@/utils/request";
const response = await request.get<ApiResponse<User[]>>("/api/v1/users");
console.log(response.data.code); // 200
console.log(response.data.message); // "查询成功"
console.log(response.data.data); // User[]
```

### 4. 错误处理

#### 4.1 自动错误处理

请求失败时会自动显示错误提示：

```typescript
// 400: "请求参数错误"
// 401: "登录已过期，请重新登录" (自动跳转登录页)
// 403: "无权限访问该资源"
// 404: "请求的资源不存在"
// 429: "请求过于频繁，请稍后再试"
// 500: "服务器内部错误，请联系管理员"
// 503: "服务暂时不可用，请稍后再试"
```

#### 4.2 自定义错误处理

```typescript
const customErrorHandling = async () => {
  try {
    const data = await get("/api/v1/data", undefined, {
      skipErrorHandler: true, // 跳过自动错误处理
    });
    return data;
  } catch (error: any) {
    // 自定义错误处理
    if (error.response?.status === 404) {
      message.info("数据不存在，使用默认数据");
      return getDefaultData();
    }
    throw error;
  }
};
```

### 5. 最佳实践

#### 5.1 API封装

建议将API请求封装到独立的service文件中：

```typescript
// services/user.service.ts
import { get, post, put, del } from "@/utils/request";

export interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
}

export interface QueryParams {
  page: number;
  pageSize: number;
  keyword?: string;
}

export interface PageResult<T> {
  list: T[];
  total: number;
}

export const userService = {
  // 获取用户列表
  getList: (params: QueryParams) => {
    return get<PageResult<User>>("/api/v1/users", params);
  },

  // 获取用户详情
  getDetail: (id: string) => {
    return get<User>(`/api/v1/users/${id}`);
  },

  // 创建用户
  create: (data: Partial<User>) => {
    return post<User>("/api/v1/users", data, {
      showSuccess: true,
    });
  },

  // 更新用户
  update: (id: string, data: Partial<User>) => {
    return put<User>(`/api/v1/users/${id}`, data, {
      showSuccess: true,
    });
  },

  // 删除用户
  delete: (id: string) => {
    return del(`/api/v1/users/${id}`, undefined, {
      showSuccess: true,
    });
  },
};
```

#### 5.2 在组件中使用

```typescript
// pages/users/index.tsx
import { useState, useEffect } from 'react';
import { userService, User, QueryParams } from '@/services/user.service';

const UserList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const loadUsers = async (params: QueryParams) => {
    setLoading(true);
    try {
      const result = await userService.getList(params);
      setUsers(result.list);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await userService.delete(id);
    // 删除成功后刷新列表
    loadUsers({ page: 1, pageSize: 10 });
  };

  useEffect(() => {
    loadUsers({ page: 1, pageSize: 10 });
  }, []);

  return (
    <div>
      {/* 用户列表UI */}
    </div>
  );
};
```

#### 5.3 使用React Query

推荐使用React Query管理请求状态：

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/user.service';

const UserList = () => {
  const queryClient = useQueryClient();

  // 查询用户列表
  const { data, isLoading } = useQuery({
    queryKey: ['users', { page: 1, pageSize: 10 }],
    queryFn: () => userService.getList({ page: 1, pageSize: 10 }),
  });

  // 删除用户
  const deleteMutation = useMutation({
    mutationFn: userService.delete,
    onSuccess: () => {
      // 删除成功后刷新列表
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div>
      {/* 用户列表UI */}
    </div>
  );
};
```

### 6. 环境配置

#### 6.1 配置API地址

在 `.env` 文件中配置：

```bash
# 开发环境
VITE_API_BASE_URL=http://localhost:8080/api

# 生产环境
VITE_API_BASE_URL=https://api.example.com/api
```

#### 6.2 多环境配置

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8080/api

# .env.test
VITE_API_BASE_URL=https://test-api.example.com/api

# .env.production
VITE_API_BASE_URL=https://api.example.com/api
```

### 7. 常见问题

#### 7.1 Token过期处理

Token过期时会自动：

1. 显示"登录已过期"提示
2. 清除本地Token
3. 跳转到登录页

#### 7.2 请求超时

默认超时时间30秒，可以在请求时自定义：

```typescript
const data = await get("/api/v1/data", undefined, {
  timeout: 60000, // 60秒超时
});
```

#### 7.3 取消请求

```typescript
import axios from "axios";

const source = axios.CancelToken.source();

const loadData = async () => {
  try {
    const data = await get("/api/v1/data", undefined, {
      cancelToken: source.token,
    });
    return data;
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log("请求已取消");
    }
  }
};

// 取消请求
source.cancel("用户取消操作");
```

#### 7.4 并发请求

```typescript
const loadAllData = async () => {
  const [users, roles, departments] = await Promise.all([
    userService.getList({ page: 1, pageSize: 10 }),
    roleService.getList(),
    departmentService.getList(),
  ]);

  return { users, roles, departments };
};
```

## 📝 注意事项

1. ✅ 所有API请求必须使用统一的request工具
2. ✅ 敏感操作必须启用防重放
3. ✅ 建议将API封装到service文件中
4. ✅ 使用TypeScript定义请求和响应类型
5. ❌ 不要在组件中直接使用axios
6. ❌ 不要绕过统一的错误处理
7. ❌ 不要在请求中硬编码API地址

---

**最后更新时间**: 2026-04-15
**文档版本**: V1.0
