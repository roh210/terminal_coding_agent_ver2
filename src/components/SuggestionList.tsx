import React from "react";
import { Box, Text } from "ink";

interface SuggestionListProps {
  suggestions: string[];
  selectedIndex: number;
  mode: "files";
}

/**
 * Displays a list of file suggestions with keyboard navigation
 */
export const SuggestionList: React.FC<SuggestionListProps> = ({
  suggestions,
  selectedIndex,
  mode,
}) => {
  if (suggestions.length === 0) {
    return null;
  }

  const title = "Files:";
  const icon = "📁";

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="cyan" bold>
        {icon} {title}
      </Text>
      <Box flexDirection="column" marginLeft={2}>
        {suggestions.map((suggestion, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box key={suggestion}>
              <Text
                color={isSelected ? "green" : "gray"}
                bold={isSelected}
                dimColor={!isSelected}
              >
                {isSelected ? "▶ " : "  "}
                {suggestion}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Use ↑/↓ to navigate, Tab to select, Esc to cancel</Text>
      </Box>
    </Box>
  );
};
