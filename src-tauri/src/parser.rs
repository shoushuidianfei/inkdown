use regex::Regex;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::path::Path;

// Wikilink 正则: [[文件名]] 或 [[文件名|显示文本]]
static WIKILINK_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]").unwrap()
});

// 嵌入语法正则: ![[文件名]]
static EMBED_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"!\[\[([^\]]+)\]\]").unwrap()
});

// 标签正则: #标签名 (不包括代码块内的)
static TAG_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?:^|\s)#([a-zA-Z一-龥][a-zA-Z0-9一-龥_-]*)").unwrap()
});

// Front Matter 正则
static FRONTMATTER_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?s)^---\s*\n(.*?)\n---\s*\n").unwrap()
});

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedLink {
    pub target: String,
    pub display_text: String,
    pub is_embed: bool,
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedTag {
    pub name: String,
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrontMatter {
    pub title: Option<String>,
    pub tags: Vec<String>,
    pub date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedFile {
    pub title: String,
    pub links: Vec<ParsedLink>,
    pub tags: Vec<String>,
    pub frontmatter: FrontMatter,
}

// 解析 Wikilink
pub fn parse_wikilinks(content: &str) -> Vec<ParsedLink> {
    let mut links = Vec::new();

    // 先移除代码块
    let content_without_code = remove_code_blocks(content);

    for cap in WIKILINK_REGEX.captures_iter(&content_without_code) {
        let target = cap[1].to_string();
        let display_text = cap.get(2).map_or(target.clone(), |m| m.as_str().to_string());
        let start = cap.get(0).unwrap().start();
        let end = cap.get(0).unwrap().end();

        links.push(ParsedLink {
            target,
            display_text,
            is_embed: false,
            start,
            end,
        });
    }

    for cap in EMBED_REGEX.captures_iter(&content_without_code) {
        let target = cap[1].to_string();
        let start = cap.get(0).unwrap().start();
        let end = cap.get(0).unwrap().end();

        links.push(ParsedLink {
            target: target.clone(),
            display_text: target,
            is_embed: true,
            start,
            end,
        });
    }

    links
}

// 解析标签
pub fn parse_tags(content: &str) -> Vec<ParsedTag> {
    let mut tags = Vec::new();
    let content_without_code = remove_code_blocks(content);

    for cap in TAG_REGEX.captures_iter(&content_without_code) {
        let name = cap[1].to_string();
        let start = cap.get(1).unwrap().start();
        let end = cap.get(1).unwrap().end();

        tags.push(ParsedTag { name, start, end });
    }

    tags
}

// 解析 Front Matter
pub fn parse_frontmatter(content: &str) -> FrontMatter {
    let mut title = None;
    let mut tags = Vec::new();
    let mut date = None;

    if let Some(cap) = FRONTMATTER_REGEX.captures(content) {
        let yaml_content = &cap[1];

        for line in yaml_content.lines() {
            let line = line.trim();

            if line.starts_with("title:") {
                title = Some(line[6..].trim().trim_matches('"').to_string());
            } else if line.starts_with("tags:") {
                let tags_str = line[5..].trim();
                if tags_str.starts_with('[') && tags_str.ends_with(']') {
                    // 数组格式: [tag1, tag2]
                    let inner = &tags_str[1..tags_str.len()-1];
                    tags = inner.split(',')
                        .map(|t| t.trim().trim_matches('"').to_string())
                        .filter(|t| !t.is_empty())
                        .collect();
                }
            } else if line.starts_with("date:") {
                date = Some(line[5..].trim().trim_matches('"').to_string());
            }
        }
    }

    FrontMatter { title, tags, date }
}

// 从内容中提取标题
pub fn extract_title(content: &str, path: &str) -> String {
    // 先尝试从 frontmatter 获取
    let fm = parse_frontmatter(content);
    if let Some(title) = fm.title {
        return title;
    }

    // 尝试获取第一个 # 标题
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("# ") {
            return line[2..].to_string();
        }
    }

    // 使用文件名作为标题
    Path::new(path)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

// 移除代码块
fn remove_code_blocks(content: &str) -> String {
    let mut result = String::new();
    let mut in_code_block = false;

    for line in content.lines() {
        if line.starts_with("```") {
            in_code_block = !in_code_block;
            continue;
        }

        if !in_code_block {
            result.push_str(line);
            result.push('\n');
        }
    }

    result
}

// 解析文件内容，提取链接和标签
pub fn parse_file_content(content: &str, path: &str) -> ParsedFile {
    let links = parse_wikilinks(content);
    let tags = parse_tags(content);
    let frontmatter = parse_frontmatter(content);
    let title = extract_title(content, path);

    // 合并 frontmatter 中的标签
    let mut all_tags: Vec<String> = tags.iter().map(|t| t.name.clone()).collect();
    for tag in &frontmatter.tags {
        if !all_tags.contains(tag) {
            all_tags.push(tag.clone());
        }
    }

    ParsedFile {
        title,
        links,
        tags: all_tags,
        frontmatter,
    }
}
