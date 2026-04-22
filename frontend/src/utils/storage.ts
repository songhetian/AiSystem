/**
 * 本地存储管理工具
 * 提供带过期时间的本地存储功能
 */
class StorageManager {
  private prefix = 'aisystem_';
  
  /**
   * 设置带过期时间的存储
   * @param key 键名
   * @param value 值
   * @param ttl 过期时间(毫秒)
   */
  setWithExpiry(key: string, value: any, ttl: number) {
    const now = new Date();
    const item = {
      value,
      expiry: now.getTime() + ttl,
    };
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.error('LocalStorage 写入失败:', error);
    }
  }

  /**
   * 获取带过期时间的存储
   * @param key 键名
   * @returns 值或null
   */
  getWithExpiry(key: string) {
    const itemStr = localStorage.getItem(this.prefix + key);
    if (!itemStr) return null;

    try {
      const item = JSON.parse(itemStr);
      const now = new Date();
      
      // 检查是否过期
      if (now.getTime() > item.expiry) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }
      
      return item.value;
    } catch (error) {
      console.error('LocalStorage 读取失败:', error);
      return null;
    }
  }

  /**
   * 设置永久存储
   * @param key 键名
   * @param value 值
   */
  set(key: string, value: any) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.error('LocalStorage 写入失败:', error);
    }
  }

  /**
   * 获取存储
   * @param key 键名
   * @returns 值或null
   */
  get(key: string) {
    const itemStr = localStorage.getItem(this.prefix + key);
    if (!itemStr) return null;

    try {
      return JSON.parse(itemStr);
    } catch (error) {
      console.error('LocalStorage 读取失败:', error);
      return null;
    }
  }

  /**
   * 删除存储
   * @param key 键名
   */
  remove(key: string) {
    localStorage.removeItem(this.prefix + key);
  }

  /**
   * 清空所有存储
   */
  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * 清理过期数据
   */
  cleanup() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        const cleanKey = key.replace(this.prefix, '');
        this.getWithExpiry(cleanKey); // 会自动删除过期数据
      }
    });
  }

  /**
   * 获取存储大小(字节)
   */
  getSize(): number {
    let size = 0;
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    });
    return size;
  }

  /**
   * 获取存储大小(可读格式)
   */
  getSizeReadable(): string {
    const bytes = this.getSize();
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
}

// 创建单例
export const storage = new StorageManager();

// 定期清理过期数据(每小时)
if (typeof window !== 'undefined') {
  setInterval(() => {
    storage.cleanup();
  }, 60 * 60 * 1000);
}

export default storage;
