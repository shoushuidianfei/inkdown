// WebDAV 客户端服务
// 注意：由于浏览器 CORS 限制，实际部署需要通过 Tauri 后端代理请求

export interface WebDAVConfig {
  server: string;
  username: string;
  password: string;
  folder: string;
}

export interface RemoteFile {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  lastModified: string;
  etag?: string;
}

export interface SyncResult {
  uploaded: string[];
  downloaded: string[];
  conflicts: string[];
  errors: string[];
}

// 预设配置
export const WEBDAV_PRESETS: Record<string, Partial<WebDAVConfig>> = {
  jianguoyun: {
    server: "https://dav.jianguoyun.com/dav/",
    folder: "/inkdown/",
  },
  aliyundrive: {
    server: "https://dav.aliyundrive.com/dav/",
    folder: "/inkdown/",
  },
};

export class WebDAVClient {
  private config: WebDAVConfig;
  private baseUrl: string;

  constructor(config: WebDAVConfig) {
    this.config = config;
    this.baseUrl = config.server.replace(/\/$/, "");
  }

  // 获取认证头
  private getAuthHeaders(): Record<string, string> {
    const credentials = btoa(`${this.config.username}:${this.config.password}`);
    return {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/xml",
    };
  }

  // 发送 WebDAV 请求
  private async request(
    method: string,
    path: string,
    body?: string | ArrayBuffer,
    headers?: Record<string, string>
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        ...this.getAuthHeaders(),
        ...headers,
      },
      body,
    });

    return response;
  }

  // 列出目录内容
  async listFiles(path: string = this.config.folder): Promise<RemoteFile[]> {
    const response = await this.request(
      "PROPFIND",
      path,
      `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:resourcetype/>
    <D:getcontentlength/>
    <D:getlastmodified/>
    <D:getetag/>
  </D:prop>
</D:propfind>`,
      { Depth: "1" }
    );

    if (!response.ok) {
      throw new Error(`列出文件失败: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    return this.parseMultiStatus(text, path);
  }

  // 解析 PROPFIND 响应
  private parseMultiStatus(xml: string, basePath: string): RemoteFile[] {
    const files: RemoteFile[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");

    const responses = doc.querySelectorAll("response");

    responses.forEach((response) => {
      const href = response.querySelector("href")?.textContent || "";
      const isDir = response.querySelector("resourcetype collection") !== null;
      const size = parseInt(response.querySelector("getcontentlength")?.textContent || "0");
      const lastModified = response.querySelector("getlastmodified")?.textContent || "";
      const etag = response.querySelector("getetag")?.textContent || "";

      // 解码路径
      const decodedPath = decodeURIComponent(href);

      // 获取相对路径
      const relativePath = decodedPath.replace(this.baseUrl, "").replace(basePath, "");

      // 跳过目录本身
      if (!relativePath || relativePath === "/") return;

      files.push({
        name: relativePath.split("/").filter(Boolean).pop() || "",
        path: relativePath,
        isDir,
        size,
        lastModified,
        etag,
      });
    });

    return files;
  }

  // 下载文件
  async download(path: string): Promise<string> {
    const response = await this.request("GET", path);

    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  // 上传文件
  async upload(path: string, content: string): Promise<void> {
    const response = await this.request(
      "PUT",
      path,
      content,
      { "Content-Type": "text/markdown; charset=utf-8" }
    );

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status} ${response.statusText}`);
    }
  }

  // 创建目录
  async mkdir(path: string): Promise<void> {
    const response = await this.request("MKCOL", path);

    // 405 表示目录已存在，忽略
    if (!response.ok && response.status !== 405) {
      throw new Error(`创建目录失败: ${response.status} ${response.statusText}`);
    }
  }

  // 删除文件
  async delete(path: string): Promise<void> {
    const response = await this.request("DELETE", path);

    if (!response.ok && response.status !== 404) {
      throw new Error(`删除失败: ${response.status} ${response.statusText}`);
    }
  }

  // 检查文件是否存在
  async exists(path: string): Promise<boolean> {
    const response = await this.request("HEAD", path);
    return response.ok;
  }

  // 获取文件信息
  async stat(path: string): Promise<RemoteFile | null> {
    const response = await this.request(
      "PROPFIND",
      path,
      `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:resourcetype/>
    <D:getcontentlength/>
    <D:getlastmodified/>
    <D:getetag/>
  </D:prop>
</D:propfind>`,
      { Depth: "0" }
    );

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    const files = this.parseMultiStatus(text, this.config.folder);
    return files[0] || null;
  }
}

// 同步管理器
export class SyncManager {
  private client: WebDAVClient;
  private config: WebDAVConfig;

  constructor(config: WebDAVConfig) {
    this.config = config;
    this.client = new WebDAVClient(config);
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      await this.client.listFiles();
      return true;
    } catch (error) {
      console.error("连接测试失败:", error);
      return false;
    }
  }

  // 同步文件
  async sync(
    localFiles: Map<string, { content: string; modifiedAt: number }>,
    onProgress?: (message: string) => void
  ): Promise<SyncResult> {
    const result: SyncResult = {
      uploaded: [],
      downloaded: [],
      conflicts: [],
      errors: [],
    };

    try {
      // 确保远程目录存在
      await this.client.mkdir(this.config.folder);

      // 获取远程文件列表
      onProgress?.("获取远程文件列表...");
      const remoteFiles = await this.client.listFiles();

      // 构建远程文件 Map
      const remoteFileMap = new Map<string, RemoteFile>();
      remoteFiles.forEach((file) => {
        if (!file.isDir) {
          remoteFileMap.set(file.path, file);
        }
      });

      // 处理本地文件
      for (const [localPath, localFile] of localFiles) {
        const remotePath = `${this.config.folder}${localPath}`;

        try {
          const remoteFile = remoteFileMap.get(localPath);

          if (!remoteFile) {
            // 远程不存在，上传
            onProgress?.(`上传: ${localPath}`);
            await this.client.upload(remotePath, localFile.content);
            result.uploaded.push(localPath);
          } else {
            // 远程存在，比较修改时间
            const remoteModified = new Date(remoteFile.lastModified).getTime();
            const localModified = localFile.modifiedAt;

            if (localModified > remoteModified + 1000) {
              // 本地更新，上传
              onProgress?.(`上传: ${localPath}`);
              await this.client.upload(remotePath, localFile.content);
              result.uploaded.push(localPath);
            } else if (remoteModified > localModified + 1000) {
              // 远程更新，下载
              onProgress?.(`下载: ${localPath}`);
              await this.client.download(remotePath);
              result.downloaded.push(localPath);
              // 注意：实际需要将内容返回给调用者更新本地文件
            }
            // 如果时间接近，认为是同步的，跳过
          }
        } catch (error) {
          result.errors.push(`${localPath}: ${error}`);
        }
      }

      // 检查远程独有的文件（需要下载）
      for (const [remotePath, remoteFile] of remoteFileMap) {
        if (!localFiles.has(remotePath) && !remoteFile.isDir) {
          try {
            onProgress?.(`下载: ${remotePath}`);
            await this.client.download(`${this.config.folder}${remotePath}`);
            result.downloaded.push(remotePath);
          } catch (error) {
            result.errors.push(`${remotePath}: ${error}`);
          }
        }
      }
    } catch (error) {
      result.errors.push(`同步失败: ${error}`);
    }

    return result;
  }
}

// 保存同步配置
export function saveSyncConfig(config: WebDAVConfig): void {
  const encrypted = btoa(JSON.stringify(config));
  localStorage.setItem("inkdown_sync_config", encrypted);
}

// 加载同步配置
export function loadSyncConfig(): WebDAVConfig | null {
  const encrypted = localStorage.getItem("inkdown_sync_config");
  if (!encrypted) return null;

  try {
    return JSON.parse(atob(encrypted));
  } catch {
    return null;
  }
}
