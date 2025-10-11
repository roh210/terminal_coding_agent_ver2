import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

interface ConfirmPromptProps {
  message: string;
  defaultValue?: boolean;
  onSubmit: (value: boolean) => void;
}

/**
 * Simple yes/no confirmation prompt component
 */
export const ConfirmPrompt: React.FC<ConfirmPromptProps> = ({
  message,
  defaultValue = true,
  onSubmit,
}) => {
  const [input, setInput] = useState("");

  const handleSubmit = (value: string) => {
    const trimmed = value.trim().toLowerCase();

    // Empty input uses default value
    if (trimmed === "") {
      onSubmit(defaultValue);
      return;
    }

    // Check for yes/no
    const isYes = trimmed === "yes" || trimmed === "y";
    onSubmit(isYes);
  };

  // Allow quick y/n/enter key responses
  useInput((inputKey, key) => {
    if (key.return && input === "") {
      // Enter on empty input = use default
      onSubmit(defaultValue);
    }
  });

  return (
    <Box flexDirection="column">
      <Text>{message}</Text>
      <Box>
        <Text color="yellow" bold>
          {defaultValue ? "[yes]: " : "[no]: "}
        </Text>
        <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
};
