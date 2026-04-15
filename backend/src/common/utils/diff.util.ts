/**
 * 工业级业务数据状态差异对比引擎 (V6.0)
 * 职责：对比业务对象更新前后的状态，梳理出变更的字段及其对应值，便于在审计日志中精准溯源。
 */
export class DiffUtil {
  /**
   * 对比两个对象并返回差异
   * 返回格式：{ "fieldName": { "from": oldVal, "to": newVal } }
   */
  static diff(oldObj: any, newObj: any): Record<string, { from: any; to: any }> | null {
    if (!oldObj || !newObj) return null;

    const changes: Record<string, { from: any; to: any }> = {};
    const ignoreKeys = ['update_time', 'create_time', 'password', 'salt'];

    // 合并两者的所有 Key
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      if (ignoreKeys.includes(key)) continue;

      const oldVal = oldObj[key];
      const newVal = newObj[key];

      // 深度对比逻辑 (仅处理简单值和基本 JSON)
      if (this.isChanged(oldVal, newVal)) {
        changes[key] = {
          from: oldVal,
          to: newVal
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  /**
   * 判断两个值是否发生实际语义变更
   */
  private static isChanged(oldVal: any, newVal: any): boolean {
    // 处理 null/undefined 同值化
    if ((oldVal === null || oldVal === undefined) && (newVal === null || newVal === undefined)) {
      return false;
    }

    // 处理 Date 对象对比
    if (oldVal instanceof Date && newVal instanceof Date) {
      return oldVal.getTime() !== newVal.getTime();
    }

    // 处理对象/数组对比 (转 JSON 字符串简单对比)
    if (typeof oldVal === 'object' || typeof newVal === 'object') {
      return JSON.stringify(oldVal) !== JSON.stringify(newVal);
    }

    return oldVal !== newVal;
  }
}
