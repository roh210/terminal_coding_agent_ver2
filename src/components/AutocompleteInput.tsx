import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { SuggestionList } from "./SuggestionList.js";
import { getSrcFiles } from "../agent/utils/fileWalker.js";
import { filterTools, filterFiles } from "../agent/utils/fuzzyFilter.js";

interface AutocompleteInputProps {
  onSubmit: (value: string) => void;
}

/**
 * Autocomplete input component with tool and file suggestions
 */
export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  onSubmit,
}) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<"tools" | "files">("tools");
  const [fileList, setFileList] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load file list on mount
  useEffect(() => {
    getSrcFiles().then(setFileList);
  }, []);

  // Update suggestions when input changes
  useEffect(() => {
    const lastAtIndex = input.lastIndexOf("@");

    // Check if we're in file mode (@ detected)
    if (lastAtIndex !== -1) {
      // Refresh file list when user types @ to get latest files
      getSrcFiles().then((freshFiles) => {
        setFileList(freshFiles);
        // Extract query after @
        const afterAt = input.slice(lastAtIndex);
        const filtered = filterFiles(afterAt, freshFiles);
        setSuggestions(filtered);
        setMode("files");
        setShowSuggestions(filtered.length > 0);
        setSelectedIndex(0);
      });
    } else {
      // Tool mode - show tools matching the input
      const filtered = filterTools(input);
      setSuggestions(filtered);
      setMode("tools");
      setShowSuggestions(input.trim().length > 0 && filtered.length > 0);
      setSelectedIndex(0);
    }
  }, [input]); // Removed fileList from dependencies to avoid infinite loop

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

      if (mode === "files") {
        // Replace from @ onwards with selected file
        const lastAtIndex = input.lastIndexOf("@");
        const newInput = input.slice(0, lastAtIndex) + "@" + selected;
        setInput(newInput);
        setShowSuggestions(false);
      } else {
        // Replace input with selected tool
        setInput(selected);
        setShowSuggestions(false);
      }
    } else if (key.escape) {
      setShowSuggestions(false);
    }
  });

  const handleSubmit = (value: string) => {
    // Clean up the input: remove @ symbols used for file browsing
    const cleanedValue = value.replace(/@/g, "");
    onSubmit(cleanedValue);
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
          mode={mode}
        />
      )}

      {!showSuggestions && input.length === 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            💡 Tip: Start typing for tool suggestions, or use @ to browse files
          </Text>
        </Box>
      )}
    </Box>
  );
};
