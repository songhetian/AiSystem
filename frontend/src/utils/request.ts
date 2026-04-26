import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { message } from "antd";
import { v4 as uuidv4 } from "uuid";

const redirectToLogin = (): void => {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;

  window.history.replaceState(null, "", "/login");
  window.dispatchEvent(new PopStateEvent("popstate"));
};

/**
 * 标准化API响应格式
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp?: string;
  path?: string;
}

/**
 * 请求配置扩展
 */
export interface RequestConfig extends AxiosRequestConfig {
  skipErrorHandler?: boolean; // 跳过错误处理
  skipAuth?: boolean; // 跳过认证
  antiReplay?: boolean; // 启用防重放
  showLoading?: boolean; // 显示加载状态
  showSuccess?: boolean; // 显示成功提示
}

/**
 * 创建Axios实例
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: (window as any).APP_CONFIG?.apiBaseUrl || process.env.VITE_API_BASE_URL || "/api/v1",
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // 请求拦截器
  instance.interceptors.request.use(
    (config: any) => {
      // 1. 添加Token
      if (!config.skipAuth) {
        const token = localStorage.getItem("token");
        if (token) {
          const authHeader = `Bearer ${token}`;
          config.headers.Authorization = authHeader;
        }
      }

      // 2. 添加防重放参数
      if (config.antiReplay) {
        config.headers["x-timestamp"] = Date.now().toString();
        config.headers["x-nonce"] = uuidv4();
      }

      // 3. 显示加载状态
      if (config.showLoading) {
        // 可以在这里显示全局loading
        // showGlobalLoading();
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    },
  );

  // 响应拦截器
  instance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
      const config = response.config as RequestConfig;

      // 隐藏加载状态
      if (config.showLoading) {
        // hideGlobalLoading();
      }

      const { code, message: msg, data } = response.data;

      // 成功响应
      if (code === 200 || code === 201) {
        // 显示成功提示
        if (config.showSuccess && msg) {
          message.success(msg);
        }
        return data;
      }

      // 业务错误
      if (!config.skipErrorHandler) {
        handleBusinessError(code, msg);
      }

      return Promise.reject(new Error(msg || "请求失败"));
    },
    (error: AxiosError<ApiResponse>) => {
      const config = error.config as RequestConfig;

      // 隐藏加载状态
      if (config?.showLoading) {
        // hideGlobalLoading();
      }

      // 跳过错误处理
      if (config?.skipErrorHandler) {
        return Promise.reject(error);
      }

      // 处理HTTP错误
      handleHttpError(error);

      return Promise.reject(error);
    },
  );

  return instance;
};

/**
 * 处理业务错误
 */
const handleBusinessError = (code: number, msg: string): void => {
  console.error(`[Request Error] ${code} at ${window.location.href}. Message: ${msg}`);
  switch (code) {
    case 400:
      message.error(msg || "请求参数错误");
      break;
    case 401:
      message.error("登录已过期，请重新登录");
      // 清除token
      localStorage.removeItem("token");
      // 跳转到登录页
      localStorage.removeItem("currentUser");
      redirectToLogin();
      break;
    case 403:
      message.error("无权限访问该资源");
      break;
    case 404:
      message.error("请求的资源不存在");
      break;
    case 409:
      message.error(msg || "资源冲突");
      break;
    case 429:
      message.warning("请求过于频繁，请稍后再试");
      break;
    case 500:
      message.error("服务器内部错误，请联系管理员");
      break;
    case 503:
      message.warning("服务暂时不可用，请稍后再试");
      break;
    default:
      message.error(msg || "请求失败");
  }
};

/**
 * 处理HTTP错误
 */
const handleHttpError = (error: AxiosError<ApiResponse>): void => {
  if (error.response) {
    // 服务器返回错误状态码
    const { status, data } = error.response;
    const msg = data?.message || error.message;
    const url = error.config?.url || 'unknown';
    console.error(`[Axios Error] Status: ${status}, URL: ${url}, Msg: ${msg}`);
    handleBusinessError(status, msg);
  } else if (error.request) {
    // 请求已发送但没有收到响应
    if (error.code === "ECONNABORTED") {
      message.error("请求超时，请检查网络连接");
    } else {
      message.error("网络错误，请检查网络连接");
    }
  } else {
    // 请求配置错误
    message.error("请求配置错误");
  }
};

/**
 * 创建请求实例
 */
const axiosInstance = createAxiosInstance();

/**
 * 类型安全的请求对象
 * 拦截器已将 AxiosResponse<ApiResponse<T>> 解包为 T，
 * 此处通过类型断言让 TypeScript 感知正确的返回类型。
 */
const request = {
  get: <T = any>(url: string, config?: RequestConfig): Promise<T> =>
    axiosInstance.get(url, config) as unknown as Promise<T>,
  post: <T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> =>
    axiosInstance.post(url, data, config) as unknown as Promise<T>,
  put: <T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> =>
    axiosInstance.put(url, data, config) as unknown as Promise<T>,
  patch: <T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> =>
    axiosInstance.patch(url, data, config) as unknown as Promise<T>,
  delete: <T = any>(url: string, config?: RequestConfig): Promise<T> =>
    axiosInstance.delete(url, config) as unknown as Promise<T>,
};

/**
 * GET请求
 */
export const get = <T = any>(
  url: string,
  params?: any,
  config?: RequestConfig,
): Promise<T> => {
  return request.get(url, { params, ...config });
};

/**
 * POST请求
 */
export const post = <T = any>(
  url: string,
  data?: any,
  config?: RequestConfig,
): Promise<T> => {
  return request.post(url, data, config);
};

/**
 * PUT请求
 */
export const put = <T = any>(
  url: string,
  data?: any,
  config?: RequestConfig,
): Promise<T> => {
  return request.put(url, data, config);
};

/**
 * DELETE请求
 */
export const del = <T = any>(
  url: string,
  params?: any,
  config?: RequestConfig,
): Promise<T> => {
  return request.delete(url, { params, ...config });
};

/**
 * 上传文件
 */
export const upload = <T = any>(
  url: string,
  file: File,
  onProgress?: (percent: number) => void,
  config?: RequestConfig,
): Promise<T> => {
  const formData = new FormData();
  formData.append("file", file);

  return request.post(url, formData, {
    ...config,
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        onProgress(percent);
      }
    },
  });
};

/**
 * 下载文件
 */
export const download = (
  url: string,
  filename: string,
  params?: any,
  config?: RequestConfig,
): Promise<void> => {
  return request
    .get(url, {
      params,
      ...config,
      responseType: "blob",
    })
    .then((response: any) => {
      const blob = new Blob([response]);
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
    });
};

export default request;
