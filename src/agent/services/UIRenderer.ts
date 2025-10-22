/**
 * UI Rendering Service
 *
 * Applies the following principles:
 * 1. Higher-Order Functions - Factory returns a configured renderer function
 * 2. Factory Pattern - Centralized component rendering setup
 * 3. Separation of Concerns - UI rendering isolated from business logic
 * 4. DRY - Single implementation for all component rendering
 *
 * Why this is better than inline rendering:
 * - Eliminates duplicate React/Ink import code
 * - Consistent rendering behavior across all components
 * - Easy to add new components (just call the renderer)
 * - Can swap UI libraries without touching Agent
 * - Testable in isolation
 */

import type React from "react";

/**
 * Configuration options for rendering a component
 */
export interface RenderOptions {
  /**
   * Auto-close the component after X milliseconds
   * If not provided, component stays open until manually closed
   */
  autoClose?: number;

  /**
   * Custom close handler called after unmounting
   */
  onCleanup?: () => void;
}

/**
 * Props that include common close handlers
 */
interface BaseProps {
  onClose?: () => void;
  [key: string]: any;
}

/**
 * Create a UI renderer function (Factory Pattern)
 *
 * This is a Higher-Order Function - it returns a function!
 *
 * Example usage:
 * ```typescript
 * const renderer = createUIRenderer();
 *
 * // Render SessionSwitcher
 * await renderer(
 *   '../../components/SessionSwitcher.js',
 *   'SessionSwitcher',
 *   { currentSessionId: '123' }
 * );
 *
 * // Render ConversationHistory with auto-close
 * await renderer(
 *   '../../components/ConversationHistory.js',
 *   'ConversationHistory',
 *   { conversationId: 'conv-1' },
 *   { autoClose: 10000 }
 * );
 * ```
 *
 * @returns A configured renderer function
 */
export const createUIRenderer = () => {
  /**
   * Render a React component using Ink
   *
   * @param componentPath - Relative path to the component file
   * @param componentName - Named export to use from the module
   * @param props - Props to pass to the component
   * @param options - Rendering options (auto-close, cleanup, etc.)
   */
  return async <P extends BaseProps>(
    componentPath: string,
    componentName: string,
    props: P,
    options: RenderOptions = {}
  ): Promise<void> => {
    // Dynamic imports - only load React/Ink when needed
    const React = await import("react");
    const { render } = await import("ink");

    // Resolve the component path relative to this file's location
    // This ensures paths work correctly at runtime in the dist/ folder
    const { fileURLToPath, pathToFileURL } = await import("url");
    const { dirname, resolve } = await import("path");
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const resolvedPath = resolve(currentDir, componentPath);

    // Debug: Log path resolution
    console.log(`[UIRenderer Debug]`);
    console.log(`  Component path: ${componentPath}`);
    console.log(`  Current dir: ${currentDir}`);
    console.log(`  Resolved path: ${resolvedPath}`);

    // Convert to file:// URL for ESM import (required on Windows)
    const fileUrl = pathToFileURL(resolvedPath).href;
    console.log(`  File URL: ${fileUrl}`);

    const module = await import(fileUrl);
    const Component = module[componentName];

    // Wrap in Promise to handle async unmounting
    return new Promise<void>((resolve) => {
      // Track if component was already unmounted
      let isUnmounted = false;

      // Cleanup function to call when component closes
      const cleanup = () => {
        if (isUnmounted) return;
        isUnmounted = true;

        unmount();

        // Small delay to ensure clean unmount
        setTimeout(() => {
          if (options.onCleanup) {
            options.onCleanup();
          }
          resolve();
        }, 50);
      };

      // Inject onClose handler into props if component expects it
      const propsWithClose: P = {
        ...props,
        onClose: props.onClose || cleanup,
      };

      // Render the component
      const { unmount } = render(
        React.createElement(Component as React.ComponentType<P>, propsWithClose)
      );

      // Handle auto-close if specified
      if (options.autoClose !== undefined) {
        setTimeout(() => {
          cleanup();
        }, options.autoClose);
      }
    });
  };
};

/**
 * Type for the renderer function returned by createUIRenderer
 * Useful for dependency injection and typing
 */
export type UIRenderer = ReturnType<typeof createUIRenderer>;
