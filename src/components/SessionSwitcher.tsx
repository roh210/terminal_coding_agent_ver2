import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import type { ContextManager } from "../agent/context/ContextManager.js";
import type { Session } from "../agent/context/types.js";

/**
 * SessionSwitcher Component
 *
 * Displays a list of all project sessions and allows the user to:
 * - View all sessions with metadata (last active, message count, project path)
 * - Switch between sessions
 * - Create new sessions
 * - Highlight the currently active session
 *
 * UI Pattern: Dropdown-style selector with keyboard navigation
 * - Up/Down arrows: Navigate sessions
 * - Enter: Select/switch to highlighted session
 * - 'n': Create new session
 * - Esc: Close dropdown
 */

export interface SessionSwitcherProps {
  /** Context manager instance for fetching session data */
  contextManager: ContextManager;

  /** Currently active session ID */
  currentSessionId: string | null;

  /** Current project path to filter sessions */
  currentProject: string;

  /** Callback when user switches to a different session */
  onSessionChange: (sessionId: string) => void;

  /** Callback when user wants to create a new session */
  onCreateSession: () => void;

  /** Whether the dropdown is currently visible */
  isOpen: boolean;

  /** Callback to close the dropdown */
  onClose: () => void;
}

interface SessionWithStats extends Session {
  messageCount: number;
  lastActiveFormatted: string;
}

export const SessionSwitcher: React.FC<SessionSwitcherProps> = ({
  contextManager,
  currentSessionId,
  currentProject,
  onSessionChange,
  onCreateSession,
  isOpen,
  onClose,
}) => {
  const [sessions, setSessions] = useState<SessionWithStats[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all sessions with their statistics
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("[SessionSwitcher] Loading sessions...");
        const allSessions = await contextManager.listSessions();
        console.log(
          `[SessionSwitcher] Found ${allSessions.length} total session(s)`
        );

        // Filter to only sessions for the current project
        const projectSessions = allSessions.filter(
          (session) => session.project === currentProject
        );
        console.log(
          `[SessionSwitcher] Filtered to ${projectSessions.length} session(s) for current project`
        );

        // Enrich each session with statistics
        const enrichedSessions: SessionWithStats[] = await Promise.all(
          projectSessions.map(async (session) => {
            const conversations = await contextManager.getSessionConversations(
              session.id
            );
            const totalMessages = await conversations.reduce(
              async (sumPromise, conv) => {
                const sum = await sumPromise;
                const messages = await contextManager.getConversationMessages(
                  conv.id
                );
                return sum + messages.length;
              },
              Promise.resolve(0)
            );

            const lastActive = new Date(session.lastActive);
            const now = new Date();
            const diffMs = now.getTime() - lastActive.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            let lastActiveFormatted: string;
            if (diffMins < 1) {
              lastActiveFormatted = "Just now";
            } else if (diffMins < 60) {
              lastActiveFormatted = `${diffMins}m ago`;
            } else if (diffHours < 24) {
              lastActiveFormatted = `${diffHours}h ago`;
            } else {
              lastActiveFormatted = `${diffDays}d ago`;
            }

            return {
              ...session,
              messageCount: totalMessages,
              lastActiveFormatted,
            };
          })
        );

        // Sort by last active (most recent first)
        enrichedSessions.sort(
          (a, b) =>
            new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
        );

        setSessions(enrichedSessions);

        // Set selected index to current session if it exists
        if (currentSessionId) {
          const currentIndex = enrichedSessions.findIndex(
            (s) => s.id === currentSessionId
          );
          if (currentIndex !== -1) {
            setSelectedIndex(currentIndex);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("[SessionSwitcher] Error loading sessions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load sessions"
        );
        setLoading(false);
      }
    };

    if (isOpen) {
      loadSessions();
    }
  }, [contextManager, currentSessionId, currentProject, isOpen]);

  // Handle keyboard input
  useInput((input, key) => {
    if (!isOpen) return;

    // Navigation
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(sessions.length - 1, prev + 1));
    }

    // Selection
    else if (key.return) {
      const selectedSession = sessions[selectedIndex];
      if (selectedSession && selectedSession.id !== currentSessionId) {
        console.log(
          `[SessionSwitcher] Switching to session: ${selectedSession.id}`
        );
        onSessionChange(selectedSession.id);
      }
      onClose();
    }

    // Create new session
    else if (input === "n" || input === "N") {
      console.log("[SessionSwitcher] Creating new session...");
      onCreateSession();
      onClose();
    }

    // Close
    else if (key.escape) {
      console.log("[SessionSwitcher] Closing session switcher");
      onClose();
    }
  });

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
    >
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          📁 Session Switcher
        </Text>
        <Text dimColor>
          Project: {currentProject.split(/[/\\]/).pop() || currentProject}
        </Text>
      </Box>

      {loading && (
        <Box>
          <Text color="yellow">Loading sessions...</Text>
        </Box>
      )}

      {error && (
        <Box>
          <Text color="red">❌ Error: {error}</Text>
        </Box>
      )}

      {!loading && !error && sessions.length === 0 && (
        <Box flexDirection="column">
          <Text color="gray">No sessions found</Text>
          <Box marginTop={1}>
            <Text dimColor>Press </Text>
            <Text bold color="green">
              n
            </Text>
            <Text dimColor> to create a new session</Text>
          </Box>
        </Box>
      )}

      {!loading && !error && sessions.length > 0 && (
        <Box flexDirection="column">
          {sessions.map((session, index) => {
            const isSelected = index === selectedIndex;
            const isCurrent = session.id === currentSessionId;

            return (
              <Box
                key={session.id}
                marginBottom={index < sessions.length - 1 ? 1 : 0}
              >
                <Box flexDirection="column" width="100%">
                  {/* Session title line */}
                  <Box>
                    {/* Selection indicator */}
                    <Text color={isSelected ? "cyan" : "gray"}>
                      {isSelected ? "▶ " : "  "}
                    </Text>

                    {/* Current session indicator */}
                    {isCurrent && <Text color="green">● </Text>}
                    {!isCurrent && <Text> </Text>}

                    {/* Session name */}
                    <Text
                      bold={isSelected || isCurrent}
                      color={
                        isCurrent ? "green" : isSelected ? "white" : "gray"
                      }
                    >
                      {session.name}
                    </Text>

                    {/* Last active time */}
                    <Text dimColor> ({session.lastActiveFormatted})</Text>
                  </Box>

                  {/* Session metadata line */}
                  <Box marginLeft={4}>
                    <Text dimColor>
                      💬 {session.messageCount} msg
                      {session.messageCount !== 1 ? "s" : ""}
                    </Text>
                    <Text dimColor> • </Text>
                    <Text dimColor>
                      📂{" "}
                      {session.project
                        ? session.project.split(/[/\\]/).pop() ||
                          session.project
                        : "No project"}
                    </Text>
                  </Box>
                </Box>
              </Box>
            );
          })}

          {/* Help text */}
          <Box marginTop={1} flexDirection="column">
            <Box>
              <Text dimColor>↑↓ Navigate • </Text>
              <Text bold color="green">
                Enter
              </Text>
              <Text dimColor> Switch • </Text>
              <Text bold color="green">
                n
              </Text>
              <Text dimColor> New • </Text>
              <Text bold color="red">
                Esc
              </Text>
              <Text dimColor> Close</Text>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SessionSwitcher;
