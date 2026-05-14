import { create } from "zustand";
import {
  AIConfig,
  AIMessage,
  AIProvider,
  AI_PROVIDERS,
  chatCompletionStream,
  generateTags,
  processText,
  saveAIConfig,
  loadAIConfig,
} from "../services/ai";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface AIState {
  // 配置
  config: AIConfig | null;
  providers: AIProvider[];

  // 聊天
  messages: ChatMessage[];
  isStreaming: boolean;
  currentResponse: string;

  // Actions
  loadConfig: () => void;
  saveConfig: (config: AIConfig) => void;
  clearConfig: () => void;

  // 聊天
  sendMessage: (content: string, noteContext?: string) => Promise<void>;
  clearMessages: () => void;

  // 文本处理
  processText: (text: string, action: string) => Promise<string>;

  // 标签生成
  generateTags: (content: string) => Promise<string[]>;
}

export const useAIStore = create<AIState>((set, get) => ({
  // 初始状态
  config: null,
  providers: AI_PROVIDERS,
  messages: [],
  isStreaming: false,
  currentResponse: "",

  // 加载配置
  loadConfig: () => {
    const config = loadAIConfig();
    set({ config });
  },

  // 保存配置
  saveConfig: (config: AIConfig) => {
    saveAIConfig(config);
    set({ config });
  },

  // 清除配置
  clearConfig: () => {
    localStorage.removeItem("inkdown_ai_config");
    set({ config: null });
  },

  // 发送消息
  sendMessage: async (content: string, noteContext?: string) => {
    const { config, messages } = get();
    if (!config) {
      throw new Error("未配置 AI，请先在设置中配置");
    }

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: Date.now(),
    };

    set({
      messages: [...messages, userMessage],
      isStreaming: true,
      currentResponse: "",
    });

    // 构建消息列表
    const apiMessages: AIMessage[] = [];

    // 系统提示
    if (noteContext) {
      apiMessages.push({
        role: "system",
        content: `用户正在查看的笔记内容：\n\n${noteContext}\n\n请基于以上笔记内容回答用户问题。`,
      });
    }

    // 历史消息
    for (const msg of messages) {
      if (msg.role !== "system") {
        apiMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // 当前消息
    apiMessages.push({
      role: "user",
      content,
    });

    // 发送请求
    try {
      await chatCompletionStream(
        config,
        apiMessages,
        (chunk) => {
          set((state) => ({
            currentResponse: state.currentResponse + chunk,
          }));
        },
        () => {
          const { currentResponse } = get();
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: currentResponse,
            timestamp: Date.now(),
          };

          set((state) => ({
            messages: [...state.messages, assistantMessage],
            isStreaming: false,
            currentResponse: "",
          }));
        }
      );
    } catch (error) {
      set({ isStreaming: false });
      throw error;
    }
  },

  // 清除消息
  clearMessages: () => {
    set({ messages: [], currentResponse: "" });
  },

  // 处理文本
  processText: async (text: string, action: string) => {
    const { config } = get();
    if (!config) {
      throw new Error("未配置 AI，请先在设置中配置");
    }
    return processText(config, text, action);
  },

  // 生成标签
  generateTags: async (content: string) => {
    const { config } = get();
    if (!config) {
      throw new Error("未配置 AI，请先在设置中配置");
    }
    return generateTags(config, content);
  },
}));
