import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { ContextManager } from "../agent/context/index.js";
import type { Message } from "../agent/context/types.js";

interface ConversationHistoryProps {
  conversationId: string;
  maxMessages?: number;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversationId,
  maxMessages = 50,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      console.log(
        "[ConversationHistory] Loading messages for:",
        conversationId
      );

      const contextManager = new ContextManager();
      const conversation = await contextManager.getConversation(conversationId);

      console.log("[ConversationHistory] Loaded conversation:", {
        found: !!conversation,
        messageCount: conversation?.messages.length || 0,
      });

      if (conversation) {
        setMessages(conversation.messages.slice(-maxMessages));
      }
      setError(null);
    } catch (err) {
      console.error("[ConversationHistory] Error loading:", err);
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const messageDate = new Date(date);
    const diff = now.getTime() - messageDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (loading) {
    return <Text color="gray">Loading conversation history...</Text>;
  }

  if (error) {
    return <Text color="red">Error: {error}</Text>;
  }

  if (messages.length === 0) {
    return <Text color="gray">No messages yet. Start chatting!</Text>;
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        Conversation History ({messages.length})
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {messages.map((message, index) => (
          <Box key={message.id} flexDirection="column" marginBottom={1}>
            {/* Timestamp */}
            <Text color="gray" dimColor>
              ⏱️ {formatTimestamp(message.timestamp)}
            </Text>

            {/* Role and Content */}
            <Box>
              <Text color={message.role === "user" ? "blue" : "green"}>
                {message.role === "user" ? "👤 User" : "🤖 Assistant"}:
              </Text>
              <Text> {truncateText(message.content)}</Text>
            </Box>

            {/* File References */}
            {message.fileReferences && message.fileReferences.length > 0 && (
              <Box marginLeft={2}>
                <Text color="yellow">
                  📁 {message.fileReferences.join(", ")}
                </Text>
              </Box>
            )}

            {/* Tool Calls */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <Box marginLeft={2}>
                <Text color="magenta">
                  🔧 {message.toolCalls.map((tc) => tc.tool).join(", ")}
                </Text>
              </Box>
            )}

            {/* Separator */}
            {index < messages.length - 1 && (
              <Text color="gray" dimColor>
                ─────────────────────────────────
              </Text>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
