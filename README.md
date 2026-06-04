# email-safe

[![RepoRanker](https://reporanker.com/badge/PasateArtem/email-safe)](https://reporanker.com/repo/PasateArtem/email-safe)

> Tailwind CSS + ESLint tools for email-safe HTML. AI-maintained compatibility matrix.

**The problem:** Tailwind classes like `flex`, `grid`, `rounded-lg`, `animate-*` silently break in Outlook and Gmail. Litmus costs $500/mo to catch this.

**The solution:** Drop-in ESLint plugin that warns you in your IDE. Free. Framework-agnostic.

---

## Packages

| Package | Description | npm |
|---|---|---|
| `eslint-plugin-email-safe` | ESLint rules for email-unsafe Tailwind classes | soon |
| `tailwind-email-safe` | Tailwind plugin with MSO/Outlook utilities | soon |
| `@email-safe/agent` | AI agent that monitors email client changes weekly | internal |

---

## Quick Start

### ESLint Plugin

```bash
npm install --save-dev eslint-plugin-email-safe
```

```js
// eslint.config.js
import emailSafe from 'eslint-plugin-email-safe'

export default [
  {
    files: ['**/emails/**/*.{jsx,tsx}'],
    ...emailSafe.configs.recommended,
  }
]
```

Тепер `flex`, `grid`, `rounded-lg` підсвічуються прямо в IDE:

```
⚠  "flex" (display:flex) не підтримується в: Outlook Windows
   https://www.caniemail.com/features/css-display-flex/
```

### Tailwind Plugin

```bash
npm install --save-dev tailwind-email-safe
```

```js
// tailwind.config.js
module.exports = {
  plugins: [require('tailwind-email-safe')],
}
```

Отримуєш MSO утиліти:

```html
<!-- Outlook-safe table layout -->
<table class="email-table w-full max-w-email-md mx-auto">
  <tr>
    <td class="email-td mso-lh-exact p-6">
      <img class="email-img" src="logo.png" />
    </td>
  </tr>
</table>
```

---

## Що перевіряється

89 Tailwind паттернів з [caniemail.com](https://caniemail.com) даних:

| Клас | Проблема |
|---|---|
| `flex`, `inline-flex` | Не підтримується в Outlook Windows |
| `grid`, `grid-cols-*` | Не підтримується в Outlook + Gmail |
| `rounded`, `rounded-*` | Ігнорується в Outlook Windows |
| `animate-*` | CSS animations не працюють |
| `bg-gradient-*` | Градієнти не в Outlook |
| `fixed`, `sticky` | Position не підтримується |
| `shadow-*` | box-shadow не в Outlook |
| `w-screen`, `h-screen` | vw/vh не підтримуються |

---

## AI Monitoring Agent

Матриця підтримується актуальною автоматично — AI агент щопонеділка сканує:
- Gmail Developers Blog
- Microsoft 365 Roadmap
- WebKit Release Notes
- caniemail GitHub Issues

Якщо знайдено зміни → автоматичний PR з оновленою матрицею.

---

## License

MIT
