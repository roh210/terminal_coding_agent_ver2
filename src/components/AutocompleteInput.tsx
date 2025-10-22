import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { SuggestionList } from "./SuggestionList.js";
import { getSrcFiles } from "../agent/utils/fileWalker.js";
import { filterFiles } from "../agent/utils/fuzzyFilter.js";

interface AutocompleteInputProps {
  onSubmit: (value: string) => void;
}

// Available slash commands
const SLASH_COMMANDS = [
  { command: "/help", description: "Show available commands" },
  { command: "/sessions", description: "Switch between project sessions" },
  { command: "/history", description: "View conversation history" },
];

/**
 * Autocomplete input component with file reference and slash command suggestions
 */
export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  onSubmit,
}) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fileList, setFileList] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionMode, setSuggestionMode] = useState<"files" | "commands">(
    "files"
  );

  // Load file list on mount
  useEffect(() => {
    getSrcFiles().then(setFileList);
  }, []);

  // Update suggestions when input changes
  useEffect(() => {
    // Check for slash commands (must be at start)
    if (input.startsWith("/")) {
      const query = input.toLowerCase();
      const filtered = SLASH_COMMANDS.filter((cmd) =>
        cmd.command.startsWith(query)
      ).map((cmd) => cmd.command);

      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSuggestionMode("commands");
      setSelectedIndex(0);
      return;
    }

    // Check if we're in file reference mode (@ detected)
    const lastAtIndex = input.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      // Refresh file list when user types @ to get latest files
      getSrcFiles().then((freshFiles) => {
        setFileList(freshFiles);
        // Extract query after @
        const afterAt = input.slice(lastAtIndex);
        const filtered = filterFiles(afterAt, freshFiles);
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        setSuggestionMode("files");
        setSelectedIndex(0);
      });
    } else {
      // No @ symbol or / - hide suggestions
      setShowSuggestions(false);
    }
  }, [input]);

  // Handle keyboard navigation
  useInput((inputKey, key) => {
    if (!showSuggestions) return;

    if (key.upArrow) {
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (key.downArrow) {
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (key.tab || (key.return && selectedIndex >= 0)) {
      // Insert selected suggestion
      const selected = suggestions[selectedIndex];

      if (suggestionMode === "commands") {
        // Replace entire input with selected command
        setInput(selected);
      } else {
        // Insert selected file reference (existing behavior)
        const lastAtIndex = input.lastIndexOf("@");
        const newInput = input.slice(0, lastAtIndex) + "@" + selected;
        setInput(newInput);
      }

      setShowSuggestions(false);
    } else if (key.escape) {
      setShowSuggestions(false);
    }
  });

  const handleSubmit = (value: string) => {
    onSubmit(value);
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          💬 How can I help you?
        </Text>
      </Box>

      <Box>
        <Text color="blue" bold>
          You:{" "}
        </Text>
        <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
      </Box>

      {showSuggestions && (
        <SuggestionList
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          mode={suggestionMode}
        />
      )}

      {!showSuggestions && input.length === 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            💡 Tip: Use @filename to reference files in your request , use / to
            get list of commands
          </Text>
        </Box>
      )}
    </Box>
  );
};
