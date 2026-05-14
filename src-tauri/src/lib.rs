mod commands;
mod database;
mod parser;
mod sync;

use commands::*;
use database::*;
use parser::*;
use std::fs;
use std::path::Path;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::Mutex;
use notify::{Watcher, RecursiveMode, Event, EventKind};
use once_cell::sync::Lazy;
use tauri::Emitter;

static WATCHER: Lazy<Mutex<Option<Box<dyn Watcher + Send>>>> = Lazy::new(|| Mutex::new(None));

#[tauri::command]
fn init_index(vault_path: String) -> Result<(), String> {
    database::init_database(&vault_path).map_err(|e| format!("初始化数据库失败: {}", e))
}

#[tauri::command]
fn index_file(vault_path: String, relative_path: String) -> Result<(), String> {
    let full_path = Path::new(&vault_path).join(&relative_path);

    if !full_path.exists() {
        return Err("文件不存在".to_string());
    }

    let content = fs::read_to_string(&full_path)
        .map_err(|e| format!("读取文件失败: {}", e))?;

    // 计算文件 hash
    let mut hasher = DefaultHasher::new();
    content.hash(&mut hasher);
    let file_hash = format!("{:x}", hasher.finish());

    // 检查是否需要更新
    if let Ok(Some(existing)) = database::get_file_record(&relative_path) {
        if existing.file_hash == file_hash {
            return Ok(());
        }
    }

    // 解析文件内容
    let parsed = parser::parse_file_content(&content, &relative_path);

    // 获取文件元数据
    let metadata = fs::metadata(&full_path)
        .map_err(|e| format!("获取文件元数据失败: {}", e))?;

    let created_at = metadata
        .created()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let modified_at = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    // 创建文件记录
    let file_record = FileRecord {
        id: 0,
        path: relative_path.clone(),
        title: parsed.title,
        content: content.clone(),
        tags: parsed.tags,
        created_at,
        modified_at,
        file_hash,
    };

    // 保存到数据库
    database::upsert_file(&file_record)
        .map_err(|e| format!("保存文件记录失败: {}", e))?;

    // 更新反向链接
    let links: Vec<(String, String)> = parsed.links.iter()
        .filter(|l| !l.is_embed)
        .map(|l| (l.target.clone(), l.display_text.clone()))
        .collect();

    database::update_backlinks(&relative_path, links)
        .map_err(|e| format!("更新反向链接失败: {}", e))?;

    Ok(())
}

#[tauri::command]
fn index_all_files(vault_path: String) -> Result<usize, String> {
    let root = Path::new(&vault_path);

    // 初始化数据库
    database::init_database(&vault_path)
        .map_err(|e| format!("初始化数据库失败: {}", e))?;

    let mut count = 0;

    // 遍历所有 .md 文件
    for entry in walkdir::WalkDir::new(root)
        .into_iter()
        .filter_entry(|e| !e.file_name().to_str().map_or(false, |s| s.starts_with('.')))
    {
        let entry = entry.map_err(|e| format!("遍历目录失败: {}", e))?;
        let path = entry.path();

        if path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
            let relative_path = path
                .strip_prefix(root)
                .unwrap_or(path)
                .to_string_lossy()
                .to_string();

            match index_file(vault_path.clone(), relative_path) {
                Ok(_) => count += 1,
                Err(e) => eprintln!("索引文件失败 {}: {}", path.display(), e),
            }
        }
    }

    Ok(count)
}

#[tauri::command]
fn search(query: String) -> Result<Vec<SearchResult>, String> {
    database::search_files(&query)
        .map_err(|e| format!("搜索失败: {}", e))
}

#[tauri::command]
fn get_backlinks_for_file(file_path: String) -> Result<Vec<Backlink>, String> {
    database::get_backlinks(&file_path)
        .map_err(|e| format!("获取反向链接失败: {}", e))
}

#[tauri::command]
fn get_all_tags() -> Result<Vec<(String, usize)>, String> {
    database::get_all_tags()
        .map_err(|e| format!("获取标签失败: {}", e))
}

#[tauri::command]
fn get_graph_data() -> Result<GraphData, String> {
    database::get_graph_data()
        .map_err(|e| format!("获取图谱数据失败: {}", e))
}

#[tauri::command]
fn parse_wikilinks_in_file(content: String) -> Vec<ParsedLink> {
    parser::parse_wikilinks(&content)
}

#[tauri::command]
fn parse_tags_in_file(content: String) -> Vec<String> {
    parser::parse_tags(&content).iter().map(|t| t.name.clone()).collect()
}

#[tauri::command]
fn start_file_watcher(vault_path: String, app: tauri::AppHandle) -> Result<(), String> {
    // 先停止旧的 watcher
    stop_file_watcher_internal();

    let app_clone = app.clone();

    let mut watcher = notify::recommended_watcher(move |res: Result<Event, _>| {
        if let Ok(event) = res {
            // 只关心文件创建、修改、删除事件
            if matches!(event.kind, EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)) {
                // 只处理 .md 文件
                let has_md = event.paths.iter().any(|p| {
                    p.extension().map_or(false, |ext| ext == "md")
                });
                if has_md {
                    let _ = app_clone.emit("vault-changed", ());
                }
            }
        }
    }).map_err(|e| format!("创建文件监听器失败: {}", e))?;

    watcher.watch(Path::new(&vault_path), RecursiveMode::Recursive)
        .map_err(|e| format!("启动文件监听失败: {}", e))?;

    let mut w = WATCHER.lock().unwrap();
    *w = Some(Box::new(watcher));

    Ok(())
}

#[tauri::command]
fn stop_file_watcher() -> Result<(), String> {
    stop_file_watcher_internal();
    Ok(())
}

fn stop_file_watcher_internal() {
    let mut w = WATCHER.lock().unwrap();
    *w = None;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            open_vault,
            list_files,
            read_file,
            write_file,
            create_file,
            create_directory,
            rename_file,
            delete_file,
            init_index,
            index_file,
            index_all_files,
            search,
            get_backlinks_for_file,
            get_all_tags,
            get_graph_data,
            parse_wikilinks_in_file,
            parse_tags_in_file,
            start_file_watcher,
            stop_file_watcher,
            sync::webdav_test_connection,
            sync::webdav_sync
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
