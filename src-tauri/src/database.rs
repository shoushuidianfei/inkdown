use rusqlite::{Connection, Result as SqlResult, params};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use jieba_rs::Jieba;

static JIEBA: Lazy<Jieba> = Lazy::new(Jieba::new);

static DB: Lazy<Mutex<Option<Connection>>> = Lazy::new(|| Mutex::new(None));

// 使用 jieba 对中文内容进行分词，用空格连接
fn tokenize_content(content: &str) -> String {
    JIEBA.cut(content, false).join(" ")
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileRecord {
    pub id: i64,
    pub path: String,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    pub created_at: i64,
    pub modified_at: i64,
    pub file_hash: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Backlink {
    pub source_path: String,
    pub target_path: String,
    pub link_text: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    pub path: String,
    pub title: String,
    pub snippet: String,
    pub score: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GraphNode {
    pub id: String,
    pub title: String,
    pub tag_count: usize,
    pub connection_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GraphEdge {
    pub source: String,
    pub target: String,
}

// 初始化数据库
pub fn init_database(vault_path: &str) -> SqlResult<()> {
    let db_path = Path::new(vault_path).join(".appdata").join("index.db");

    let conn = Connection::open(&db_path)?;

    // 创建 files 表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE NOT NULL,
            title TEXT,
            content TEXT,
            tags TEXT DEFAULT '[]',
            created_at INTEGER,
            modified_at INTEGER,
            file_hash TEXT
        )",
        [],
    )?;

    // 创建 backlinks 表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS backlinks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_path TEXT NOT NULL,
            target_path TEXT NOT NULL,
            link_text TEXT,
            UNIQUE(source_path, target_path, link_text)
        )",
        [],
    )?;

    // 创建 FTS5 虚拟表用于全文搜索
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
            path,
            title,
            content,
            tags,
            tokenize='unicode61'
        )",
        [],
    )?;

    // 创建索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_files_path ON files(path)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_backlinks_source ON backlinks(source_path)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_backlinks_target ON backlinks(target_path)",
        [],
    )?;

    let mut db = DB.lock().unwrap();
    *db = Some(conn);

    Ok(())
}

// 插入或更新文件记录
pub fn upsert_file(file: &FileRecord) -> SqlResult<()> {
    let db = DB.lock().unwrap();
    let conn = db.as_ref().unwrap();

    conn.execute(
        "INSERT OR REPLACE INTO files (path, title, content, tags, created_at, modified_at, file_hash)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            file.path,
            file.title,
            file.content,
            serde_json::to_string(&file.tags).unwrap_or_default(),
            file.created_at,
            file.modified_at,
            file.file_hash,
        ],
    )?;

    // 更新 FTS 索引（使用 jieba 分词后的中文内容）
    conn.execute(
        "DELETE FROM search_index WHERE path = ?1",
        params![file.path],
    )?;
    let tokenized_content = tokenize_content(&file.content);
    conn.execute(
        "INSERT INTO search_index (path, title, content, tags) VALUES (?1, ?2, ?3, ?4)",
        params![file.path, file.title, tokenized_content, serde_json::to_string(&file.tags).unwrap_or_default()],
    )?;

    Ok(())
}

// 删除文件记录
pub fn delete_file_record(path: &str) -> SqlResult<()> {
    let db = DB.lock().unwrap();
    let conn = db.as_ref().unwrap();

    conn.execute("DELETE FROM files WHERE path = ?1", params![path])?;
    conn.execute("DELETE FROM backlinks WHERE source_path = ?1 OR target_path = ?1", params![path])?;
    conn.execute("DELETE FROM search_index WHERE path = ?1", params![path])?;

    Ok(())
}

// 重命名文件记录（更新所有表中的路径）
pub fn rename_file_record(old_path: &str, new_path: &str) -> SqlResult<()> {
    let db = DB.lock().unwrap();
    let conn = db.as_ref().unwrap();

    conn.execute("UPDATE files SET path = ?1 WHERE path = ?2", params![new_path, old_path])?;
    conn.execute("UPDATE backlinks SET source_path = ?1 WHERE source_path = ?2", params![new_path, old_path])?;
    conn.execute("UPDATE backlinks SET target_path = ?1 WHERE target_path = ?2", params![new_path, old_path])?;
    conn.execute("UPDATE search_index SET path = ?1 WHERE path = ?2", params![new_path, old_path])?;

    Ok(())
}

// 更新反向链接
pub fn update_backlinks(source_path: &str, links: Vec<(String, String)>) -> SqlResult<()> {
    let db = DB.lock().unwrap();
    let conn = db.as_ref().unwrap();

    // 删除旧的反向链接
    conn.execute(
        "DELETE FROM backlinks WHERE source_path = ?1",
        params![source_path],
    )?;

    // 插入新的反向链接
    for (target_path, link_text) in links {
        conn.execute(
            "INSERT OR IGNORE INTO backlinks (source_path, target_path, link_text) VALUES (?1, ?2, ?3)",
            params![source_path, target_path, link_text],
        )?;
    }

    Ok(())
}

// 获取文件的反向链接
pub fn get_backlinks(target_path: &str) -> SqlResult<Vec<Backlink>> {
    let db = DB.lock().unwrap();
    let conn = db.as_ref().unwrap();

    let mut stmt = conn.prepare(
        "SELECT source_path, target_path, link_text FROM backlinks WHERE target_path = ?1"
    )?;

    let backlinks = stmt.query_map(params![target_path], |row| {
        Ok(Backlink {
            source_path: row.get(0)?,
            target_path: row.get(1)?,
            link_text: row.get(2)?,
        })
    })?.collect::<SqlResult<Vec<_>>>()?;

    Ok(backlinks)
}

// 全文搜索（对查询也进行分词）
pub fn search_files(query: &str) -> SqlResult<Vec<SearchResult>> {
    let db = DB.lock().unwrap();
    let conn = db.as_ref().unwrap();

    let tokenized_query = tokenize_content(query);

    let mut stmt = conn.prepare(
        "SELECT path, title, snippet(search_index, 2, '<mark>', '</mark>', '...', 32) as snippet,
                rank
         FROM search_index
         WHERE search_index MATCH ?1
         ORDER BY rank
         LIMIT 50"
    )?;

    let results = stmt.query_map(params![tokenized_query], |row| {
        Ok(SearchResult {
            path: row.get(0)?,
            title: row.get(1)?,
            snippet: row.get(2)?,
            score: row.get(3)?,
        })
    })?.collect::<SqlResult<Vec<_>>>()?;

    Ok(results)
}

// 获取所有标签
pub fn get_all_tags() -> SqlResult<Vec<(String, usize)>> {
    let db = DB.lock().unwrap();
    let conn = db.as_ref().unwrap();

    let mut stmt = conn.prepare("SELECT tags FROM files WHERE tags != '[]'")?;

    let mut tag_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();

    let rows: Vec<String> = stmt.query_map([], |row| {
        Ok(row.get::<_, String>(0)?)
    })?.collect::<SqlResult<Vec<_>>>()?;

    for row in rows {
        if let Ok(tags) = serde_json::from_str::<Vec<String>>(&row) {
            for tag in tags {
                *tag_counts.entry(tag).or_insert(0) += 1;
            }
        }
    }

    let mut result: Vec<(String, usize)> = tag_counts.into_iter().collect();
    result.sort_by(|a, b| b.1.cmp(&a.1));

    Ok(result)
}

// 获取图谱数据
pub fn get_graph_data() -> SqlResult<GraphData> {
    let db = DB.lock().unwrap();
    let conn = db.as_ref().unwrap();

    // 获取所有文件
    let mut stmt = conn.prepare("SELECT path, title, tags FROM files")?;
    let files: Vec<(String, String, Vec<String>)> = stmt.query_map([], |row| {
        let tags_str: String = row.get(2)?;
        let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
        Ok((row.get(0)?, row.get(1)?, tags))
    })?.collect::<SqlResult<Vec<_>>>()?;

    // 获取所有链接
    let mut stmt = conn.prepare("SELECT source_path, target_path FROM backlinks")?;
    let edges: Vec<(String, String)> = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?))
    })?.collect::<SqlResult<Vec<_>>>()?;

    // 计算每个节点的连接数
    let mut connection_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for (source, target) in &edges {
        *connection_counts.entry(source.clone()).or_insert(0) += 1;
        *connection_counts.entry(target.clone()).or_insert(0) += 1;
    }

    let nodes: Vec<GraphNode> = files.iter().map(|(path, title, tags)| {
        GraphNode {
            id: path.clone(),
            title: title.clone(),
            tag_count: tags.len(),
            connection_count: *connection_counts.get(path).unwrap_or(&0),
        }
    }).collect();

    let graph_edges: Vec<GraphEdge> = edges.iter().map(|(source, target)| {
        GraphEdge {
            source: source.clone(),
            target: target.clone(),
        }
    }).collect();

    Ok(GraphData {
        nodes,
        edges: graph_edges,
    })
}

// 获取文件记录
pub fn get_file_record(path: &str) -> SqlResult<Option<FileRecord>> {
    let db = DB.lock().unwrap();
    let conn = db.as_ref().unwrap();

    let mut stmt = conn.prepare(
        "SELECT id, path, title, content, tags, created_at, modified_at, file_hash FROM files WHERE path = ?1"
    )?;

    let mut rows = stmt.query_map(params![path], |row| {
        let tags_str: String = row.get(4)?;
        let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
        Ok(FileRecord {
            id: row.get(0)?,
            path: row.get(1)?,
            title: row.get(2)?,
            content: row.get(3)?,
            tags,
            created_at: row.get(5)?,
            modified_at: row.get(6)?,
            file_hash: row.get(7)?,
        })
    })?;

    match rows.next() {
        Some(Ok(record)) => Ok(Some(record)),
        Some(Err(e)) => Err(e),
        None => Ok(None),
    }
}
