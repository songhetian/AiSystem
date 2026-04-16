/**
 * 文件下载工具函数
 */

/**
 * 下载JSON文件
 * @param data - 要下载的数据
 * @param filename - 文件名（不含扩展名）
 */
export function downloadJSON(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * 下载Blob对象
 * @param blob - Blob对象
 * @param filename - 文件名
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 读取文件内容
 * @param file - 文件对象
 * @returns Promise<string> - 文件内容
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("文件读取失败"));
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsText(file);
  });
}

/**
 * 解析JSON文件
 * @param file - 文件对象
 * @returns Promise<any> - 解析后的JSON对象
 */
export async function parseJSONFile(file: File): Promise<any> {
  try {
    const text = await readFileAsText(file);
    return JSON.parse(text);
  } catch (error) {
    throw new Error("JSON文件格式错误");
  }
}
