use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::fs;
use tauri::Emitter;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebDAVConfig {
    pub server: String,
    pub username: String,
    pub password: String,
    pub folder: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteFile {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub last_modified: String,
    pub etag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub uploaded: Vec<String>,
    pub downloaded: Vec<String>,
    pub conflicts: Vec<String>,
    pub errors: Vec<String>,
}

pub struct WebDAVClient {
    config: WebDAVConfig,
    client: Client,
    base_url: String,
}

impl WebDAVClient {
    pub fn new(config: WebDAVConfig) -> Self {
        let base_url = config.server.trim_end_matches('/').to_string();
        let client = Client::builder()
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            config,
            client,
            base_url,
        }
    }

    fn auth_header(&self) -> String {
        use base64::Engine;
        let credentials = format!("{}:{}", self.config.username, self.config.password);
        let encoded = base64::engine::general_purpose::STANDARD.encode(credentials.as_bytes());
        format!("Basic {}", encoded)
    }

    // PROPFIND: 列出目录内容
    pub async fn list_files(&self, path: &str) -> Result<Vec<RemoteFile>, String> {
        let url = format!("{}{}", self.base_url, path);

        let body = r#"<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:resourcetype/>
    <D:getcontentlength/>
    <D:getlastmodified/>
    <D:getetag/>
  </D:prop>
</D:propfind>"#;

        let response = self
            .client
            .request(reqwest::Method::from_bytes(b"PROPFIND").unwrap(), &url)
            .header("Authorization", self.auth_header())
            .header("Content-Type", "application/xml")
            .header("Depth", "1")
            .body(body)
            .send()
            .await
            .map_err(|e| format!("WebDAV 请求失败: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("列出文件失败: {}", response.status()));
        }

        let xml = response
            .text()
            .await
            .map_err(|e| format!("读取响应失败: {}", e))?;

        self.parse_multi_status(&xml, path)
    }

    // 解析 PROPFIND XML 响应
    fn parse_multi_status(&self, xml: &str, base_path: &str) -> Result<Vec<RemoteFile>, String> {
        use quick_xml::events::Event;
        use quick_xml::Reader;

        let mut reader = Reader::from_str(xml);
        let mut files = Vec::new();

        let mut in_response = false;
        let mut current_href = String::new();
        let mut current_is_dir = false;
        let mut current_size: u64 = 0;
        let mut current_last_modified = String::new();
        let mut current_etag = String::new();
        let mut current_tag = String::new();

        loop {
            match reader.read_event() {
                Ok(Event::Start(e)) => {
                    let tag_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                    let local_name = tag_name.split(':').last().unwrap_or(&tag_name).to_string();

                    match local_name.as_str() {
                        "response" => {
                            in_response = true;
                            current_href.clear();
                            current_is_dir = false;
                            current_size = 0;
                            current_last_modified.clear();
                            current_etag.clear();
                        }
                        "collection" if in_response => {
                            current_is_dir = true;
                        }
                        _ if in_response => {
                            current_tag = local_name;
                        }
                        _ => {}
                    }
                }
                Ok(Event::Text(e)) if in_response => {
                    let text = e.unescape().unwrap_or_default().to_string();
                    match current_tag.as_str() {
                        "href" => current_href = text,
                        "getcontentlength" => {
                            current_size = text.parse().unwrap_or(0);
                        }
                        "getlastmodified" => current_last_modified = text,
                        "getetag" => current_etag = text,
                        _ => {}
                    }
                }
                Ok(Event::End(e)) => {
                    let tag_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                    let local_name = tag_name.split(':').last().unwrap_or(&tag_name).to_string();

                    if local_name == "response" && in_response {
                        in_response = false;

                        // 解码 URL
                        let decoded_href = urlencoding_decode(&current_href);

                        // 获取相对路径
                        let base_url_path = self.base_url.trim_end_matches('/');
                        let relative = decoded_href
                            .trim_start_matches(base_url_path)
                            .trim_start_matches(base_path)
                            .trim_start_matches('/')
                            .to_string();

                        // 跳过目录本身
                        if !relative.is_empty() && relative != "/" {
                            let name = relative
                                .split('/')
                                .filter(|s| !s.is_empty())
                                .last()
                                .unwrap_or("")
                                .to_string();

                            files.push(RemoteFile {
                                name,
                                path: relative,
                                is_dir: current_is_dir,
                                size: current_size,
                                last_modified: current_last_modified.clone(),
                                etag: if current_etag.is_empty() {
                                    None
                                } else {
                                    Some(current_etag.clone())
                                },
                            });
                        }
                    }
                }
                Ok(Event::Eof) => break,
                Err(_) => break,
                _ => {}
            }
        }

        Ok(files)
    }

    // GET: 下载文件
    pub async fn download(&self, path: &str) -> Result<String, String> {
        let url = format!("{}{}", self.base_url, path);

        let response = self
            .client
            .get(&url)
            .header("Authorization", self.auth_header())
            .send()
            .await
            .map_err(|e| format!("下载请求失败: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("下载失败: {}", response.status()));
        }

        response
            .text()
            .await
            .map_err(|e| format!("读取下载内容失败: {}", e))
    }

    // PUT: 上传文件
    pub async fn upload(&self, path: &str, content: &str) -> Result<(), String> {
        let url = format!("{}{}", self.base_url, path);

        let response = self
            .client
            .put(&url)
            .header("Authorization", self.auth_header())
            .header("Content-Type", "text/markdown; charset=utf-8")
            .body(content.to_string())
            .send()
            .await
            .map_err(|e| format!("上传请求失败: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("上传失败: {}", response.status()));
        }

        Ok(())
    }

    // MKCOL: 创建目录
    pub async fn mkdir(&self, path: &str) -> Result<(), String> {
        let url = format!("{}{}", self.base_url, path);

        let response = self
            .client
            .request(reqwest::Method::from_bytes(b"MKCOL").unwrap(), &url)
            .header("Authorization", self.auth_header())
            .send()
            .await
            .map_err(|e| format!("创建目录请求失败: {}", e))?;

        // 405 表示目录已存在，忽略
        if !response.status().is_success() && response.status().as_u16() != 405 {
            return Err(format!("创建目录失败: {}", response.status()));
        }

        Ok(())
    }
}

// URL 解码辅助函数
fn urlencoding_decode(s: &str) -> String {
    let mut result = String::new();
    let mut chars = s.chars();
    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                result.push(byte as char);
            } else {
                result.push('%');
                result.push_str(&hex);
            }
        } else if c == '+' {
            result.push(' ');
        } else {
            result.push(c);
        }
    }
    result
}

// 测试 WebDAV 连接
#[tauri::command]
pub async fn webdav_test_connection(config: WebDAVConfig) -> Result<bool, String> {
    let client = WebDAVClient::new(config.clone());
    let folder = config.folder.clone();

    match client.list_files(&folder).await {
        Ok(_) => Ok(true),
        Err(_) => {
            // 尝试创建目录后再测试
            let _ = client.mkdir(&folder).await;
            match client.list_files(&folder).await {
                Ok(_) => Ok(true),
                Err(e) => Err(format!("连接测试失败: {}", e)),
            }
        }
    }
}

// 执行同步
#[tauri::command]
pub async fn webdav_sync(
    vault_path: String,
    config: WebDAVConfig,
    app: tauri::AppHandle,
) -> Result<SyncResult, String> {
    let client = WebDAVClient::new(config.clone());
    let mut result = SyncResult {
        uploaded: Vec::new(),
        downloaded: Vec::new(),
        conflicts: Vec::new(),
        errors: Vec::new(),
    };

    // 确保远程目录存在
    let _ = client.mkdir(&config.folder).await;

    // 获取远程文件列表
    let remote_files = match client.list_files(&config.folder).await {
        Ok(files) => files,
        Err(e) => {
            result.errors.push(format!("获取远程文件列表失败: {}", e));
            return Ok(result);
        }
    };

    // 构建远程文件 Map
    let remote_map: HashMap<String, &RemoteFile> = remote_files
        .iter()
        .filter(|f| !f.is_dir)
        .map(|f| (f.path.clone(), f))
        .collect();

    // 遍历本地 .md 文件
    let root = Path::new(&vault_path);
    let walk = walkdir::WalkDir::new(root)
        .into_iter()
        .filter_entry(|e| !e.file_name().to_str().map_or(false, |s| s.starts_with('.')));

    let mut local_files: Vec<(String, String)> = Vec::new(); // (relative_path, full_path)

    for entry in walk {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
            let relative = path
                .strip_prefix(root)
                .unwrap_or(path)
                .to_string_lossy()
                .replace('\\', "/");
            local_files.push((relative, path.to_string_lossy().to_string()));
        }
    }

    // 上传本地文件
    for (relative, full_path) in &local_files {
        let remote_path = format!("{}{}", config.folder, relative);

        match remote_map.get(relative) {
            None => {
                // 远程不存在，上传
                let _ = app.emit("sync-progress", format!("上传: {}", relative));
                match fs::read_to_string(full_path) {
                    Ok(content) => match client.upload(&remote_path, &content).await {
                        Ok(_) => result.uploaded.push(relative.clone()),
                        Err(e) => result.errors.push(format!("{}: {}", relative, e)),
                    },
                    Err(e) => result.errors.push(format!("读取本地文件失败 {}: {}", relative, e)),
                }
            }
            Some(remote_file) => {
                // 远程存在，比较修改时间
                let local_modified = fs::metadata(full_path)
                    .ok()
                    .and_then(|m| m.modified().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
                    .unwrap_or(0);

                let remote_modified = parse_http_date(&remote_file.last_modified);

                if local_modified > remote_modified + 2 {
                    // 本地更新，上传
                    let _ = app.emit("sync-progress", format!("上传: {}", relative));
                    match fs::read_to_string(full_path) {
                        Ok(content) => match client.upload(&remote_path, &content).await {
                            Ok(_) => result.uploaded.push(relative.clone()),
                            Err(e) => result.errors.push(format!("{}: {}", relative, e)),
                        },
                        Err(e) => result.errors.push(format!("{}: {}", relative, e)),
                    }
                } else if remote_modified > local_modified + 2 {
                    // 远程更新，下载
                    let _ = app.emit("sync-progress", format!("下载: {}", relative));
                    match client.download(&remote_path).await {
                        Ok(content) => {
                            if let Some(parent) = Path::new(full_path).parent() {
                                let _ = fs::create_dir_all(parent);
                            }
                            match fs::write(full_path, &content) {
                                Ok(_) => result.downloaded.push(relative.clone()),
                                Err(e) => result.errors.push(format!("{}: {}", relative, e)),
                            }
                        }
                        Err(e) => result.errors.push(format!("{}: {}", relative, e)),
                    }
                }
                // 时间接近，跳过
            }
        }
    }

    // 下载远程独有的文件
    for (remote_path, _remote_file) in &remote_map {
        if !local_files.iter().any(|(r, _)| r == remote_path) {
            let full_path = format!("{}/{}", vault_path, remote_path);
            let _ = app.emit("sync-progress", format!("下载: {}", remote_path));
            match client.download(&format!("{}{}", config.folder, remote_path)).await {
                Ok(content) => {
                    if let Some(parent) = Path::new(&full_path).parent() {
                        let _ = fs::create_dir_all(parent);
                    }
                    match fs::write(&full_path, &content) {
                        Ok(_) => result.downloaded.push(remote_path.clone()),
                        Err(e) => result.errors.push(format!("{}: {}", remote_path, e)),
                    }
                }
                Err(e) => result.errors.push(format!("{}: {}", remote_path, e)),
            }
        }
    }

    Ok(result)
}

// 解析 HTTP 日期为时间戳
fn parse_http_date(date_str: &str) -> u64 {
    // 简单解析: "Mon, 01 Jan 2024 00:00:00 GMT"
    // 使用 chrono 尝试解析
    use chrono::DateTime;
    if let Ok(dt) = DateTime::parse_from_rfc2822(date_str) {
        return dt.timestamp() as u64;
    }
    0
}
