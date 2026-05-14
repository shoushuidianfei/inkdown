use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::database;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VaultInfo {
    pub path: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
    pub modified_at: i64,
}

// 打开 Vault
#[tauri::command]
pub fn open_vault(path: String) -> Result<VaultInfo, String> {
    let vault_path = Path::new(&path);

    if !vault_path.exists() {
        return Err("路径不存在".to_string());
    }

    if !vault_path.is_dir() {
        return Err("路径不是目录".to_string());
    }

    // 创建 .appdata 目录
    let appdata_path = vault_path.join(".appdata");
    if !appdata_path.exists() {
        fs::create_dir_all(&appdata_path).map_err(|e| format!("创建 .appdata 失败: {}", e))?;
    }

    // 创建 attachments 目录
    let attachments_path = vault_path.join("attachments");
    if !attachments_path.exists() {
        fs::create_dir_all(&attachments_path)
            .map_err(|e| format!("创建 attachments 失败: {}", e))?;
    }

    let name = vault_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    Ok(VaultInfo {
        path: path.clone(),
        name,
    })
}

// 列出文件
#[tauri::command]
pub fn list_files(vault_path: String) -> Result<Vec<FileNode>, String> {
    let root = Path::new(&vault_path);
    if !root.exists() || !root.is_dir() {
        return Err("Vault 路径无效".to_string());
    }

    let mut result = Vec::new();
    scan_directory(root, root, &mut result)?;
    Ok(result)
}

fn scan_directory(root: &Path, dir: &Path, result: &mut Vec<FileNode>) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| format!("读取目录失败: {}", e))?;

    let mut dirs = Vec::new();
    let mut files = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();
        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();

        // 跳过隐藏文件和 .appdata 目录
        if name.starts_with('.') {
            continue;
        }

        let metadata = fs::metadata(&path).map_err(|e| format!("获取文件元数据失败: {}", e))?;

        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        let relative_path = path
            .strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .to_string();

        if path.is_dir() {
            let mut children = Vec::new();
            scan_directory(root, &path, &mut children)?;
            dirs.push(FileNode {
                name,
                path: relative_path,
                is_dir: true,
                children: Some(children),
                modified_at,
            });
        } else if path.extension().map_or(false, |ext| ext == "md") {
            files.push(FileNode {
                name,
                path: relative_path,
                is_dir: false,
                children: None,
                modified_at,
            });
        }
    }

    // 目录在前，文件在后，各自按名称排序
    dirs.sort_by(|a, b| a.name.cmp(&b.name));
    files.sort_by(|a, b| a.name.cmp(&b.name));

    result.extend(dirs);
    result.extend(files);

    Ok(())
}

// 读取文件
#[tauri::command]
pub fn read_file(vault_path: String, relative_path: String) -> Result<String, String> {
    let path = Path::new(&vault_path).join(&relative_path);

    if !path.exists() {
        return Err("文件不存在".to_string());
    }

    fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))
}

// 写入文件
#[tauri::command]
pub fn write_file(vault_path: String, relative_path: String, content: String) -> Result<(), String> {
    let path = Path::new(&vault_path).join(&relative_path);

    // 确保父目录存在
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
        }
    }

    fs::write(&path, content).map_err(|e| format!("写入文件失败: {}", e))
}

// 创建文件
#[tauri::command]
pub fn create_file(vault_path: String, relative_path: String) -> Result<FileNode, String> {
    let path = Path::new(&vault_path).join(&relative_path);

    // 确保父目录存在
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
        }
    }

    // 如果文件已存在，添加数字后缀
    let final_path = if path.exists() {
        let stem = path.file_stem().unwrap_or_default().to_string_lossy();
        let ext = path.extension().map(|e| e.to_string_lossy().to_string());
        let parent = path.parent().unwrap_or(Path::new(""));

        let mut counter = 1;
        loop {
            let new_name = match &ext {
                Some(ext) => format!("{} {}.{}", stem, counter, ext),
                None => format!("{} {}", stem, counter),
            };
            let new_path = parent.join(&new_name);
            if !new_path.exists() {
                break new_path;
            }
            counter += 1;
        }
    } else {
        path.clone()
    };

    // 创建空文件
    fs::write(&final_path, "").map_err(|e| format!("创建文件失败: {}", e))?;

    let name = final_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let final_relative = final_path
        .strip_prefix(&vault_path)
        .unwrap_or(&final_path)
        .to_string_lossy()
        .to_string();

    let metadata = fs::metadata(&final_path).map_err(|e| format!("获取文件元数据失败: {}", e))?;

    let modified_at = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    Ok(FileNode {
        name,
        path: final_relative,
        is_dir: false,
        children: None,
        modified_at,
    })
}

// 创建目录
#[tauri::command]
pub fn create_directory(vault_path: String, relative_path: String) -> Result<FileNode, String> {
    let path = Path::new(&vault_path).join(&relative_path);

    if path.exists() {
        return Err("目录已存在".to_string());
    }

    fs::create_dir_all(&path).map_err(|e| format!("创建目录失败: {}", e))?;

    let name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let metadata = fs::metadata(&path).map_err(|e| format!("获取目录元数据失败: {}", e))?;

    let modified_at = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    Ok(FileNode {
        name,
        path: relative_path,
        is_dir: true,
        children: Some(Vec::new()),
        modified_at,
    })
}

// 重命名文件
#[tauri::command]
pub fn rename_file(vault_path: String, old_path: String, new_path: String) -> Result<(), String> {
    let old_full = Path::new(&vault_path).join(&old_path);
    let new_full = Path::new(&vault_path).join(&new_path);

    if !old_full.exists() {
        return Err("源文件不存在".to_string());
    }

    if new_full.exists() {
        return Err("目标路径已存在".to_string());
    }

    // 确保目标父目录存在
    if let Some(parent) = new_full.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
        }
    }

    fs::rename(&old_full, &new_full).map_err(|e| format!("重命名失败: {}", e))?;

    // 更新数据库索引
    let _ = database::rename_file_record(&old_path, &new_path);

    Ok(())
}

// 删除文件（移到回收站）
#[tauri::command]
pub fn delete_file(vault_path: String, relative_path: String) -> Result<(), String> {
    let path = Path::new(&vault_path).join(&relative_path);

    if !path.exists() {
        return Err("文件不存在".to_string());
    }

    trash::delete(&path).map_err(|e| format!("删除文件失败: {}", e))?;

    // 删除数据库索引
    let _ = database::delete_file_record(&relative_path);

    Ok(())
}
