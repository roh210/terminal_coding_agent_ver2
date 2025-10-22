# Phase 8: Refactoring planning/jsonParsing.ts - Chain of Responsibility Pattern

## Overview

Phase 8 focuses on refactoring `planning/jsonParsing.ts` (244 lines) and `planning/fallbackConverter.ts` (155 lines) by applying the **Chain of Responsibility Pattern**. Currently, the JSON extraction logic has multiple nested if/else statements with hardcoded fallback strategies. We'll create a flexible chain of handlers that can process the response in sequence until one succeeds.

## The Problem: Nested Conditional Logic

### Current Structure

```
jsonParsing.ts (244 lines):
├── extractJsonFromResponse()         → Main orchestrator with nested if/else
│   ├── extractFromMarkdownCodeBlock() → Strategy 1
│   ├── extractPlainJson()            → Strategy 2
│   │   ├── extractWithBraceCounting()
│   │   └── validateOrConvert()       → Calls fallback converter
│   └── Returns null if all fail
│
├── parsePlan()                       → Validation logic
│   ├── validatePlanStructure()
│   └── validateSteps()

fallbackConverter.ts (155 lines):
├── convertFunctionCallToPlan()       → Fallback strategy
│   ├── extractJsonWithBraceCounting()
│   ├── parseFunctionCallJson()
│   └── parseRawFunctionCallJson()
```

### Why This Is a Problem

1. **Tight Coupling**: extractJsonFromResponse() knows about all strategies
2. **Hard to Extend**: Adding new parsing strategy requires modifying main function
3. **Hard to Test**: Can't test strategies in isolation easily
4. **Hard to Reorder**: Changing fallback order means editing nested logic
5. **Code Duplication**: Brace counting logic duplicated in multiple places

### Real-World Example

If we want to:

- Add a new parsing strategy (e.g., YAML support) → Must modify extractJsonFromResponse
- Change fallback order → Must restructure if/else chains
- Reuse a strategy elsewhere → Must extract and refactor
- Test edge cases → Must mock the entire chain

## The Solution: Chain of Responsibility Pattern

### Chain of Responsibility Pattern

**Definition**: "Pass requests along a chain of handlers. Each handler decides either to process the request or pass it to the next handler in the chain."

**Applied to JSON Parsing**:

- **Handlers** → Each parsing strategy (markdown, plain JSON, function_call, etc.)
- **Chain** → Handlers linked in order of preference
- **Request** → The raw content string from LLM
- **Response** → Extracted JSON string (or null to try next handler)

### Pattern Benefits

1. ✅ **Open/Closed Principle**: Add new handlers without modifying existing ones
2. ✅ **Single Responsibility**: Each handler does ONE thing
3. ✅ **Easy to Test**: Test each handler independently
4. ✅ **Flexible Configuration**: Reorder handlers by changing chain setup
5. ✅ **Code Reuse**: Handlers can be reused in different chains

## Detailed Design

### New Structure (planning/parsers/ folder)

````
planning/
├── parsers/
│   ├── types.ts                          (~40 lines) - Interfaces
│   ├── BaseHandler.ts                    (~50 lines) - Abstract base class
│   ├── MarkdownHandler.ts                (~60 lines) - Extract from ```json```
│   ├── PlainJsonHandler.ts               (~70 lines) - Brace counting
│   ├── FunctionCallHandler.ts            (~80 lines) - function_call: format
│   ├── RawFunctionCallHandler.ts         (~60 lines) - {call, arguments} format
│   ├── ParserChain.ts                    (~80 lines) - Chain orchestrator
│   └── index.ts                          (~30 lines) - Exports
│
├── validators/
│   ├── PlanValidator.ts                  (~90 lines) - Structure + steps validation
│   └── index.ts                          (~10 lines) - Exports
│
├── index.ts                              (updated) - Clean exports
├── planCreation.ts                       (unchanged) - Still works
├── jsonParsing.ts                        (DELETE after migration)
└── fallbackConverter.ts                  (DELETE after migration)
````

**Total**: ~570 lines (vs 399 lines) - More lines but MUCH better organized

### 1. types.ts - Parser Interfaces

```typescript
/**
 * Result from a parser handler
 */
export interface ParserResult {
  success: boolean;
  jsonString: string | null;
  handlerName: string;
}

/**
 * Parser handler interface (Chain of Responsibility)
 */
export interface IParserHandler {
  /**
   * Set the next handler in the chain
   */
  setNext(handler: IParserHandler): IParserHandler;

  /**
   * Process the content and return result or pass to next handler
   */
  handle(content: string): ParserResult | null;
}

/**
 * Parsing context passed through the chain
 */
export interface ParsingContext {
  originalContent: string;
  cleanedContent: string;
  attemptedHandlers: string[];
}
```

**Responsibility**: Define contracts for the chain pattern

### 2. BaseHandler.ts - Abstract Base Class

```typescript
export abstract class BaseHandler implements IParserHandler {
  private nextHandler: IParserHandler | null = null;

  /**
   * Set the next handler in the chain
   */
  setNext(handler: IParserHandler): IParserHandler {
    this.nextHandler = handler;
    return handler; // Allows chaining: h1.setNext(h2).setNext(h3)
  }

  /**
   * Handle request: try to process, or pass to next handler
   */
  handle(content: string): ParserResult | null {
    const result = this.tryParse(content);

    if (result && result.success) {
      return result;
    }

    // Pass to next handler if exists
    if (this.nextHandler) {
      return this.nextHandler.handle(content);
    }

    return null;
  }

  /**
   * Abstract method: subclasses implement their parsing logic
   */
  protected abstract tryParse(content: string): ParserResult | null;

  /**
   * Helper: log parsing attempt
   */
  protected logAttempt(handlerName: string, success: boolean): void {
    const icon = success ? ICONS.success : ICONS.warning;
    const color = success ? COLORS.green : COLORS.yellow;
    console.log(
      `${color}${icon} ${handlerName}: ${success ? "SUCCESS" : "PASS"}${
        COLORS.reset
      }`
    );
  }
}
```

**Responsibility**: Provide chain mechanism for all handlers

### 3. MarkdownHandler.ts - Extract from Code Blocks

````typescript
export class MarkdownHandler extends BaseHandler {
  protected tryParse(content: string): ParserResult | null {
    const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);

    if (codeBlockMatch) {
      this.logAttempt("MarkdownHandler", true);
      return {
        success: true,
        jsonString: codeBlockMatch[1],
        handlerName: "MarkdownHandler",
      };
    }

    this.logAttempt("MarkdownHandler", false);
    return null;
  }
}
````

**Single Responsibility**: Extract JSON from markdown code blocks

### 4. PlainJsonHandler.ts - Brace Counting

```typescript
export class PlainJsonHandler extends BaseHandler {
  protected tryParse(content: string): ParserResult | null {
    // Remove headers and cleanup
    const cleaned = this.cleanContent(content);

    // Find opening brace
    const startIndex = cleaned.indexOf("{");
    if (startIndex === -1) {
      this.logAttempt("PlainJsonHandler", false);
      return null;
    }

    // Extract using brace counting
    const jsonString = this.extractWithBraceCounting(cleaned, startIndex);

    if (jsonString) {
      // Validate it has plan structure
      if (this.hasValidPlanStructure(jsonString)) {
        this.logAttempt("PlainJsonHandler", true);
        return {
          success: true,
          jsonString,
          handlerName: "PlainJsonHandler",
        };
      }
    }

    this.logAttempt("PlainJsonHandler", false);
    return null;
  }

  private extractWithBraceCounting(
    content: string,
    startIndex: number
  ): string | null {
    // Brace counting logic (extracted from current implementation)
  }

  private hasValidPlanStructure(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      return parsed.goal && parsed.steps && Array.isArray(parsed.steps);
    } catch {
      return false;
    }
  }

  private cleanContent(content: string): string {
    return content.replace(/===.*?===/g, "").replace(/!function_call:\s*/g, "");
  }
}
```

**Single Responsibility**: Extract plain JSON using brace counting

### 5. FunctionCallHandler.ts - function_call: Format

```typescript
export class FunctionCallHandler extends BaseHandler {
  protected tryParse(content: string): ParserResult | null {
    const functionCallPrefix = content.indexOf("function_call:");

    if (functionCallPrefix === -1) {
      this.logAttempt("FunctionCallHandler", false);
      return null;
    }

    const jsonStart = content.indexOf("{", functionCallPrefix);
    if (jsonStart === -1) {
      this.logAttempt("FunctionCallHandler", false);
      return null;
    }

    const jsonString = this.extractJsonWithBraceCounting(content, jsonStart);
    if (!jsonString) {
      this.logAttempt("FunctionCallHandler", false);
      return null;
    }

    // Convert function_call format to plan format
    const planJson = this.convertFunctionCallToPlan(jsonString);

    if (planJson) {
      this.logAttempt("FunctionCallHandler", true);
      return {
        success: true,
        jsonString: planJson,
        handlerName: "FunctionCallHandler",
      };
    }

    this.logAttempt("FunctionCallHandler", false);
    return null;
  }

  private convertFunctionCallToPlan(jsonString: string): string | null {
    // Conversion logic from fallbackConverter.ts
  }
}
```

**Single Responsibility**: Handle function_call: format and convert to plan

### 6. RawFunctionCallHandler.ts - {call, arguments} Format

```typescript
export class RawFunctionCallHandler extends BaseHandler {
  protected tryParse(content: string): ParserResult | null {
    const callIndex = content.indexOf('"call"');

    if (callIndex === -1) {
      this.logAttempt("RawFunctionCallHandler", false);
      return null;
    }

    const jsonStart = content.lastIndexOf("{", callIndex);
    if (jsonStart === -1) {
      this.logAttempt("RawFunctionCallHandler", false);
      return null;
    }

    const jsonString = this.extractJsonWithBraceCounting(content, jsonStart);
    if (!jsonString) {
      this.logAttempt("RawFunctionCallHandler", false);
      return null;
    }

    const planJson = this.convertRawFunctionCall(jsonString);

    if (planJson) {
      this.logAttempt("RawFunctionCallHandler", true);
      return {
        success: true,
        jsonString: planJson,
        handlerName: "RawFunctionCallHandler",
      };
    }

    this.logAttempt("RawFunctionCallHandler", false);
    return null;
  }

  private convertRawFunctionCall(jsonString: string): string | null {
    // Conversion logic from fallbackConverter.ts
  }
}
```

**Single Responsibility**: Handle raw {call, arguments} format

### 7. ParserChain.ts - Chain Orchestrator

```typescript
export class ParserChain {
  private chain: IParserHandler;

  constructor() {
    // Build the chain in order of preference
    const markdownHandler = new MarkdownHandler();
    const plainJsonHandler = new PlainJsonHandler();
    const functionCallHandler = new FunctionCallHandler();
    const rawFunctionCallHandler = new RawFunctionCallHandler();

    // Chain them together
    this.chain = markdownHandler
      .setNext(plainJsonHandler)
      .setNext(functionCallHandler)
      .setNext(rawFunctionCallHandler);
  }

  /**
   * Process content through the entire chain
   */
  parse(content: string): ParserResult | null {
    console.log(`${COLORS.cyan}→ Starting parser chain...${COLORS.reset}`);
    return this.chain.handle(content);
  }

  /**
   * Custom chain configuration
   */
  static custom(handlers: IParserHandler[]): ParserChain {
    const chain = new ParserChain();

    for (let i = 0; i < handlers.length - 1; i++) {
      handlers[i].setNext(handlers[i + 1]);
    }

    chain.chain = handlers[0];
    return chain;
  }
}
```

**Responsibility**: Orchestrate the parsing chain

### 8. PlanValidator.ts - Separate Validation

```typescript
export class PlanValidator {
  /**
   * Validates a plan JSON string
   */
  static validate(jsonString: string): Plan | null {
    try {
      const parsed = JSON.parse(jsonString) as Plan;

      if (!this.hasValidStructure(parsed)) {
        return null;
      }

      if (!this.hasValidSteps(parsed.steps)) {
        return null;
      }

      return parsed;
    } catch (error) {
      this.logError(jsonString, error);
      return null;
    }
  }

  private static hasValidStructure(parsed: Plan): boolean {
    if (!parsed.goal || !parsed.steps || !Array.isArray(parsed.steps)) {
      console.error(
        `${COLORS.red}${ICONS.error} Invalid plan structure${COLORS.reset}`
      );
      return false;
    }
    return true;
  }

  private static hasValidSteps(steps: Plan["steps"]): boolean {
    for (const step of steps) {
      if (!step.action || !step.tool || !step.reasoning) {
        console.error(
          `${COLORS.red}${ICONS.error} Invalid step structure${COLORS.reset}`
        );
        return false;
      }
    }
    return true;
  }

  private static logError(jsonString: string, error: unknown): void {
    console.error(
      `${COLORS.red}${ICONS.error} Validation failed${COLORS.reset}`
    );
    console.error(`${COLORS.gray}JSON:${COLORS.reset}`, jsonString);
    console.error(`${COLORS.gray}Error:${COLORS.reset}`, error);
  }
}
```

**Responsibility**: Validate plan structure and steps

## Benefits of This Refactoring

### 1. Easy to Add New Parsers

```typescript
// Want YAML support? Just create a new handler!
class YamlHandler extends BaseHandler {
  protected tryParse(content: string): ParserResult | null {
    // YAML parsing logic
  }
}

// Add it to the chain
const chain = ParserChain.custom([
  new MarkdownHandler(),
  new YamlHandler(), // NEW!
  new PlainJsonHandler(),
  new FunctionCallHandler(),
  new RawFunctionCallHandler(),
]);
```

### 2. Easy to Reorder Strategies

```typescript
// Want to try function_call format first?
const chain = ParserChain.custom([
  new FunctionCallHandler(), // Try this first
  new MarkdownHandler(), // Then markdown
  new PlainJsonHandler(), // Then plain JSON
]);
```

### 3. Easy to Test Each Handler

````typescript
// Test MarkdownHandler in complete isolation
test("MarkdownHandler extracts from code blocks", () => {
  const handler = new MarkdownHandler();
  const content = '```json\n{"goal":"test"}\n```';
  const result = handler.handle(content);

  expect(result?.success).toBe(true);
  expect(result?.jsonString).toBe('{"goal":"test"}');
});
````

### 4. Easy to Debug

```typescript
// Chain logs each handler's attempt
→ Starting parser chain...
⚠️  MarkdownHandler: PASS
⚠️  PlainJsonHandler: PASS
✅ FunctionCallHandler: SUCCESS
```

## Migration Strategy

### Step 1: Create Parser Types

1. Create `planning/parsers/types.ts`
2. Define interfaces for handlers and results

### Step 2: Create Base Handler

1. Create `planning/parsers/BaseHandler.ts`
2. Implement chain mechanism

### Step 3: Create Concrete Handlers

1. `MarkdownHandler.ts` - Extract from current code
2. `PlainJsonHandler.ts` - Extract from current code
3. `FunctionCallHandler.ts` - Extract from fallbackConverter
4. `RawFunctionCallHandler.ts` - Extract from fallbackConverter

### Step 4: Create Parser Chain

1. Create `planning/parsers/ParserChain.ts`
2. Build default chain with all handlers

### Step 5: Create Validator

1. Create `planning/validators/PlanValidator.ts`
2. Extract validation logic from jsonParsing.ts

### Step 6: Update Exports

1. Update `planning/parsers/index.ts`
2. Update `planning/validators/index.ts`
3. Update `planning/index.ts`

### Step 7: Update planCreation.ts

1. Replace extractJsonFromResponse with ParserChain
2. Replace parsePlan with PlanValidator
3. Test integration

### Step 8: Delete Old Files

1. Delete `planning/jsonParsing.ts` (244 lines)
2. Delete `planning/fallbackConverter.ts` (155 lines)
3. Run all tests

## Testing Plan

### Handler Tests (~30 tests)

- ✅ MarkdownHandler: code blocks, no blocks, malformed
- ✅ PlainJsonHandler: valid JSON, invalid JSON, no braces
- ✅ FunctionCallHandler: valid function_call, invalid, missing fields
- ✅ RawFunctionCallHandler: valid {call}, invalid, missing fields

### Chain Tests (~10 tests)

- ✅ Chain tries handlers in order
- ✅ Chain stops at first success
- ✅ Chain returns null if all fail
- ✅ Custom chain configuration works
- ✅ Empty chain returns null

### Validator Tests (~8 tests)

- ✅ Valid plan passes
- ✅ Missing goal fails
- ✅ Missing steps fails
- ✅ Invalid step structure fails
- ✅ Empty steps array fails

### Integration Tests (~5 tests)

- ✅ Full pipeline: parse → validate
- ✅ Real LLM responses parse correctly
- ✅ Edge cases handled gracefully
- ✅ Backward compatibility with planCreation.ts

## Expected Outcomes

### Metrics

- **Lines of Code**: 399 → ~570 lines (+43%)
- **Number of Files**: 2 → 11 files
- **Cyclomatic Complexity**: High → Low (single responsibility)
- **Testability**: Hard → Easy (isolated units)
- **Extensibility**: Low → High (open/closed principle)

### Quality Improvements

1. ✅ **Open/Closed Principle**: Add handlers without modifying existing code
2. ✅ **Single Responsibility**: Each handler does ONE thing
3. ✅ **Testability**: Test handlers independently
4. ✅ **Flexibility**: Reorder chain easily
5. ✅ **Maintainability**: Clear separation of concerns

### Before/After Comparison

#### Before (Nested If/Else)

```typescript
export const extractJsonFromResponse = (content: string): string | null => {
  // Try markdown
  const fromCodeBlock = extractFromMarkdownCodeBlock(content);
  if (fromCodeBlock) return fromCodeBlock;

  // Try plain JSON
  const fromPlainJson = extractPlainJson(content);
  if (fromPlainJson) return fromPlainJson;

  // Try fallback converter
  const converted = convertFunctionCallToPlan(content);
  if (converted) return converted;

  return null;
};
```

#### After (Chain of Responsibility)

```typescript
export const extractJsonFromResponse = (content: string): string | null => {
  const chain = new ParserChain(); // Handlers configured in constructor
  const result = chain.parse(content);
  return result?.jsonString || null;
};
```

## Connection to Previous Phases

### Phase 6: Strategy Pattern (Formatters)

- **Pattern**: Different strategies for formatting
- **Benefit**: Swappable formatters

### Phase 7: Single Responsibility (Execution)

- **Pattern**: Separate parser and executor
- **Benefit**: Isolated, testable units

### Phase 8: Chain of Responsibility (Parsing)

- **Pattern**: Chain of handlers for fallback strategies
- **Benefit**: Flexible, extensible parsing pipeline

### Common Thread: Composing Software

All phases follow Eric Elliott's principles:

1. **Small, focused functions** (SRP)
2. **Composition over inheritance** (Strategy, Chain)
3. **Testability through isolation** (All phases)
4. **Clear contracts** (Interfaces everywhere)

## Next Steps

1. ✅ Create `planning/parsers/types.ts`
2. ✅ Create `planning/parsers/BaseHandler.ts`
3. ✅ Create `planning/parsers/MarkdownHandler.ts`
4. ✅ Create `planning/parsers/PlainJsonHandler.ts`
5. ✅ Create `planning/parsers/FunctionCallHandler.ts`
6. ✅ Create `planning/parsers/RawFunctionCallHandler.ts`
7. ✅ Create `planning/parsers/ParserChain.ts`
8. ✅ Create `planning/validators/PlanValidator.ts`
9. ✅ Update `planning/index.ts`
10. ✅ Update `planCreation.ts`
11. ✅ Write comprehensive tests
12. ✅ Delete old files
13. ✅ Verify integration

## Success Criteria

- ✅ All handler tests passing
- ✅ All chain tests passing
- ✅ All validator tests passing
- ✅ Integration with planCreation.ts works
- ✅ Build succeeds with no errors
- ✅ Existing agent functionality unchanged
- ✅ Code is more maintainable and extensible
- ✅ Each handler has a single, clear responsibility

---

**Ready to begin Phase 8!** Let's create a flexible, extensible parsing pipeline using Chain of Responsibility.
