import OpenAI from "openai";

export interface AIConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProvider {
  id: string;
  name: string;
  models: string[];
  description: string;
  baseUrl: string;
}

// 预设的 AI 提供商
export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    models: ["deepseek-chat", "deepseek-coder"],
    description: "DeepSeek AI，性价比高",
    baseUrl: "https://api.deepseek.com/v1",
  },
  {
    id: "mimo",
    name: "小米 MiMo",
    models: ["mimo-7b", "mimo-14b", "mimo-pro"],
    description: "小米自研大模型，OpenAI 兼容接口",
    baseUrl: "https://api.mimo.ai/v1",
  },
  {
    id: "qwen",
    name: "通义千问",
    models: ["qwen-turbo", "qwen-plus", "qwen-max"],
    description: "阿里云通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  {
    id: "glm",
    name: "智谱 GLM",
    models: ["glm-4-flash", "glm-4"],
    description: "智谱 AI GLM 系列",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
  },
  {
    id: "doubao",
    name: "豆包",
    models: ["doubao-lite-4k", "doubao-pro-4k"],
    description: "字节跳动豆包大模型",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
  },
  {
    id: "ollama",
    name: "Ollama 本地",
    models: ["llama3", "qwen2", "mistral"],
    description: "本地运行的开源模型",
    baseUrl: "http://localhost:11434/v1",
  },
];

// 创建 OpenAI 客户端
function createClient(config: AIConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    dangerouslyAllowBrowser: true, // 允许在浏览器中使用
  });
}

// 非流式聊天
export async function chatCompletion(
  config: AIConfig,
  messages: AIMessage[]
): Promise<string> {
  const client = createClient(config);

  const response = await client.chat.completions.create({
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  });

  return response.choices[0]?.message?.content || "";
}

// 流式聊天
export async function chatCompletionStream(
  config: AIConfig,
  messages: AIMessage[],
  onChunk: (content: string) => void,
  onDone: () => void
): Promise<void> {
  const client = createClient(config);

  const stream = await client.chat.completions.create({
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      onChunk(content);
    }
  }

  onDone();
}

// 生成标签
export async function generateTags(
  config: AIConfig,
  content: string
): Promise<string[]> {
  const messages: AIMessage[] = [
    {
      role: "system",
      content: '你是一个笔记标签生成助手。请为用户提供的笔记内容生成3-5个分类标签，用JSON数组格式回复，例如：["标签1", "标签2", "标签3"]',
    },
    {
      role: "user",
      content: `请为以下笔记生成标签：\n\n${content}`,
    },
  ];

  const response = await chatCompletion(config, messages);

  try {
    return JSON.parse(response);
  } catch {
    // 如果解析失败，尝试提取标签
    const match = response.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return [];
  }
}

// 处理文本操作
export async function processText(
  config: AIConfig,
  text: string,
  action: string
): Promise<string> {
  const systemPrompts: Record<string, string> = {
    summarize: "请总结以下文本内容，用简洁的语言概括要点。",
    expand: "请扩写以下文本，增加更多细节和说明。",
    translate_en: "请将以下中文文本翻译成英文。",
    translate_zh: "请将以下英文文本翻译成中文。",
    rewrite: "请改写以下文本，保持原意但使用不同的表达方式。",
    explain: "请解释以下文本的含义，用通俗易懂的语言。",
    keywords: "请从以下文本中提取5-10个关键词，用逗号分隔。",
  };

  const messages: AIMessage[] = [
    {
      role: "system",
      content: systemPrompts[action] || "请处理以下文本。",
    },
    {
      role: "user",
      content: text,
    },
  ];

  return chatCompletion(config, messages);
}

// 保存配置到本地存储
export function saveAIConfig(config: AIConfig): void {
  const encrypted = btoa(JSON.stringify(config));
  localStorage.setItem("inkdown_ai_config", encrypted);
}

// 从本地存储加载配置
export function loadAIConfig(): AIConfig | null {
  const encrypted = localStorage.getItem("inkdown_ai_config");
  if (!encrypted) return null;

  try {
    return JSON.parse(atob(encrypted));
  } catch {
    return null;
  }
}
