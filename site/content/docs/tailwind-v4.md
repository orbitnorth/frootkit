---
title: Tailwind CSS v4 Native
description: Configure styles with Tailwind CSS v4 and @theme without any config files.
badge: Styling
---

# Tailwind CSS v4 Native

FrootKit features built-in integration with Tailwind CSS v4 via `@tailwindcss/cli`.

## CSS-First Configuration

Tailwind v4 replaces `tailwind.config.js` with pure CSS configuration inside `src/styles.css`:

```css
@import "tailwindcss";

@theme {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Custom Color Tokens */
  --color-brand-froot: #00e676;
  --color-dark-base: #030712;
  --color-dark-card: #0d131f;
}
```

## Zero Build Configuration

No `postcss.config.js` or bundler plugins are required. The `frootkit` CLI automatically detects `src/styles.css` and runs the Tailwind engine:

- **In Development (`frootkit dev`)**: Runs the Tailwind watcher in the background and re-compiles instantly on file changes.
- **In Production (`frootkit build`)**: Emits minified, tree-shaken CSS directly to `.froot/styles.css`.

## Custom Utility Classes

Define custom utilities and components directly in `src/styles.css`:

```css
@layer components {
  .glass-card {
    background: rgba(13, 19, 31, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(16px);
  }

  .btn-primary-glow {
    background: #10b981;
    color: #030712;
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.35);
  }
}
```

