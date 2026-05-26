/**
 * Email Safe — AI Monitoring Agent
 *
 * Щотижня запускається через GitHub Actions і:
 * 1. Шукає зміни в рендерингу CSS email клієнтів
 * 2. Порівнює з поточною compat матрицею
 * 3. Якщо є зміни — оновлює матрицю і створює PR
 *
 * Запуск: node src/index.js
 * Dry run: node src/index.js --dry-run
 */

const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const isDryRun = process.argv.includes('--dry-run')
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Шляхи
const COMPAT_PATH = path.resolve(__dirname, '../../eslint-plugin-email-safe/src/data/compat.js')
const SYNC_SCRIPT = path.resolve(__dirname, '../../../scripts/sync-caniemail.js')

// ─── Інструменти для агента ────────────────────────────────────────────────

const tools = [
  {
    name: 'web_search',
    description: 'Пошук в інтернеті для отримання свіжої інформації про email клієнти',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Пошуковий запит' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_compat_matrix',
    description: 'Читає поточну compat матрицю з файлу',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'report_changes',
    description: 'Репортує знайдені зміни в підтримці CSS email клієнтами',
    input_schema: {
      type: 'object',
      properties: {
        changes: {
          type: 'array',
          description: 'Список змін',
          items: {
            type: 'object',
            properties: {
              client:    { type: 'string', description: 'Назва клієнта (Gmail, Outlook і т.д.)' },
              feature:   { type: 'string', description: 'CSS фіча що змінилась' },
              old_status:{ type: 'string', description: 'Старий статус (supported/unsupported/partial)' },
              new_status:{ type: 'string', description: 'Новий статус' },
              source:    { type: 'string', description: 'URL джерела де знайдена інформація' },
              confidence:{ type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['client', 'feature', 'new_status', 'source', 'confidence'],
          },
        },
        summary: {
          type: 'string',
          description: 'Короткий підсумок що було знайдено',
        },
        no_changes: {
          type: 'boolean',
          description: 'true якщо змін не знайдено',
        },
      },
      required: ['summary'],
    },
  },
]

// ─── Обробка інструментів ──────────────────────────────────────────────────

async function handleTool(toolName, toolInput) {
  switch (toolName) {

    case 'web_search': {
      // В реальному середовищі — інтеграція з Brave Search API або Serper
      // Для MVP — симулюємо відповідь (заміни на реальний API)
      console.log(`  🔍 Пошук: "${toolInput.query}"`)

      if (process.env.SERPER_API_KEY) {
        const res = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': process.env.SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q: toolInput.query, num: 5 }),
        })
        const data = await res.json()
        const results = data.organic?.map(r =>
          `${r.title}\n${r.link}\n${r.snippet}`
        ).join('\n\n') || 'Нічого не знайдено'
        return results
      }

      return `[Dry run] Пошук по "${toolInput.query}" — підключи SERPER_API_KEY для реальних результатів`
    }

    case 'read_compat_matrix': {
      const content = fs.readFileSync(COMPAT_PATH, 'utf8')
      // Повертаємо тільки ключі щоб не спамити токени
      const matrix = require(COMPAT_PATH)
      const summary = Object.entries(matrix)
        .slice(0, 20)
        .map(([k, v]) => `${k}: unsafe in ${v.unsupportedIn.join(', ')}`)
        .join('\n')
      return `Поточна матриця (перші 20 з ${Object.keys(matrix).length}):\n${summary}`
    }

    case 'report_changes': {
      return JSON.stringify(toolInput)
    }

    default:
      return `Невідомий інструмент: ${toolName}`
  }
}

// ─── Головний агент ────────────────────────────────────────────────────────

async function runAgent() {
  const today = new Date().toISOString().split('T')[0]

  console.log(`\n📧 Email Safe Monitoring Agent`)
  console.log(`📅 Дата: ${today}`)
  console.log(`🔍 Режим: ${isDryRun ? 'dry-run' : 'production'}\n`)

  const messages = [
    {
      role: 'user',
      content: `Сьогодні ${today}.

Ти — агент що моніторить зміни в підтримці CSS в email клієнтах.

ЗАВДАННЯ:
1. Знайди новини за останній тиждень про зміни в рендерингу CSS в цих клієнтах:
   - Gmail (desktop webmail + mobile)
   - Outlook Windows (2016, 2019, 2021)
   - Outlook.com
   - Apple Mail

2. Особливо звертай увагу на:
   - Нова підтримка flexbox/grid в якомусь клієнті
   - Зміни в обробці border-radius
   - Зміни в CSS variables підтримці
   - Будь-які Breaking changes

3. Прочитай поточну compat матрицю і порівняй.

4. Відзвітуй через report_changes:
   - Якщо знайшов зміни — деталі кожної зміни з посиланням на джерело
   - Якщо нічого нового — no_changes: true

Шукай в:
- Gmail Developers blog (developers.googleblog.com)
- Microsoft 365 roadmap (microsoft.com/en-us/microsoft-365/roadmap)
- WebKit release notes (webkit.org/blog)
- caniemail GitHub issues (github.com/hteumeuleu/caniemail)
- Email Geeks community updates`,
    },
  ]

  let finalReport = null

  // Agentic loop
  while (true) {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      tools,
      messages,
    })

    console.log(`⚡ Stop reason: ${response.stop_reason}`)

    // Додаємо відповідь в історію
    messages.push({ role: 'assistant', content: response.content })

    // Агент закінчив
    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(b => b.type === 'text')?.text
      console.log('\n📋 Фінальний звіт агента:\n', text)
      break
    }

    // Обробляємо tool calls
    if (response.stop_reason === 'tool_use') {
      const toolResults = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue

        console.log(`\n🔧 Інструмент: ${block.name}`)
        const result = await handleTool(block.name, block.input)

        // Зберігаємо report_changes якщо це він
        if (block.name === 'report_changes') {
          finalReport = block.input
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        })
      }

      messages.push({ role: 'user', content: toolResults })
    }
  }

  // ─── Обробка результатів ─────────────────────────────────────────────────

  if (!finalReport) {
    console.log('⚠️  Агент не зробив report_changes')
    return
  }

  if (finalReport.no_changes) {
    console.log('\n✅ Змін не знайдено — матриця актуальна')
    return
  }

  if (!finalReport.changes?.length) {
    console.log('\n✅ Нічого нового')
    return
  }

  console.log(`\n🔄 Знайдено ${finalReport.changes.length} змін:`)
  finalReport.changes.forEach(c => {
    console.log(`  • ${c.client}: ${c.feature} — ${c.old_status ?? '?'} → ${c.new_status} [${c.confidence}]`)
    console.log(`    Джерело: ${c.source}`)
  })

  if (isDryRun) {
    console.log('\n[Dry run] — матриця не оновлюється')
    return
  }

  // Оновлюємо матрицю і створюємо PR
  await applyChangesAndCreatePR(finalReport)
}

// ─── Застосування змін ────────────────────────────────────────────────────

async function applyChangesAndCreatePR(report) {
  console.log('\n📝 Оновлюємо compat матрицю...')

  const branchName = `agent/compat-update-${Date.now()}`
  const today = new Date().toISOString().split('T')[0]

  try {
    // Новий branch
    execSync(`git checkout -b ${branchName}`)

    // Регенеруємо матрицю з актуального caniemail
    execSync(`node ${SYNC_SCRIPT}`)

    // Комітимо
    execSync(`git add ${COMPAT_PATH}`)
    execSync(`git commit -m "chore: update compat matrix ${today} [bot]

${report.summary}

Changes found:
${report.changes.map(c => `- ${c.client}: ${c.feature} → ${c.new_status}`).join('\n')}

Sources:
${report.changes.map(c => `- ${c.source}`).join('\n')}"`)

    console.log('✅ Compat матриця оновлена')
    console.log(`📌 Branch: ${branchName}`)
    console.log('→ Відкрий PR вручну або додай gh pr create в скрипт')

  } catch (err) {
    console.error('❌ Помилка при оновленні:', err.message)
  }
}

// ─── Запуск ───────────────────────────────────────────────────────────────

runAgent().catch(err => {
  console.error('❌ Агент впав:', err.message)
  process.exit(1)
})
