/**
 * Email Safe — AI Monitoring Agent
 *
 * Runs weekly via GitHub Actions and:
 * 1. Scans for CSS rendering changes in email clients
 * 2. Compares with the current compat matrix
 * 3. If changes found — updates the matrix and creates a PR
 *
 * Run: node src/index.js
 * Dry run: node src/index.js --dry-run
 */

const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const isDryRun = process.argv.includes('--dry-run')
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Paths
const COMPAT_PATH = path.resolve(__dirname, '../../eslint-plugin-email-safe/src/data/compat.js')
const SYNC_SCRIPT = path.resolve(__dirname, '../../../scripts/sync-caniemail.js')

// --- Agent tools -----------------------------------------------------------

const tools = [
  {
    name: 'web_search',
    description: 'Search the web for up-to-date information about email client changes',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_compat_matrix',
    description: 'Reads the current compat matrix from disk',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'report_changes',
    description: 'Reports CSS support changes found in email clients',
    input_schema: {
      type: 'object',
      properties: {
        changes: {
          type: 'array',
          description: 'List of changes',
          items: {
            type: 'object',
            properties: {
              client:    { type: 'string', description: 'Client name (Gmail, Outlook, etc.)' },
              feature:   { type: 'string', description: 'CSS feature that changed' },
              old_status:{ type: 'string', description: 'Previous status (supported/unsupported/partial)' },
              new_status:{ type: 'string', description: 'New status' },
              source:    { type: 'string', description: 'URL where the change was found' },
              confidence:{ type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['client', 'feature', 'new_status', 'source', 'confidence'],
          },
        },
        summary: {
          type: 'string',
          description: 'Short summary of findings',
        },
        no_changes: {
          type: 'boolean',
          description: 'Set to true if no changes were found',
        },
      },
      required: ['summary'],
    },
  },
]

// --- Tool handlers ---------------------------------------------------------

async function handleTool(toolName, toolInput) {
  switch (toolName) {

    case 'web_search': {
      // In production — integrate with Brave Search API or Serper
      // For MVP — returns simulated response (replace with real API)
      console.log(`  Searching: "${toolInput.query}"`)

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
        ).join('\n\n') || 'No results found'
        return results
      }

      return `[Dry run] Search for "${toolInput.query}" — add SERPER_API_KEY for real results`
    }

    case 'read_compat_matrix': {
      const matrix = require(COMPAT_PATH)
      const summary = Object.entries(matrix)
        .slice(0, 20)
        .map(([k, v]) => `${k}: unsafe in ${v.unsupportedIn.join(', ')}`)
        .join('\n')
      return `Current matrix (first 20 of ${Object.keys(matrix).length}):\n${summary}`
    }

    case 'report_changes': {
      return JSON.stringify(toolInput)
    }

    default:
      return `Unknown tool: ${toolName}`
  }
}

// --- Main agent loop -------------------------------------------------------

async function runAgent() {
  const today = new Date().toISOString().split('T')[0]

  console.log(`\nEmail Safe Monitoring Agent`)
  console.log(`Date: ${today}`)
  console.log(`Mode: ${isDryRun ? 'dry-run' : 'production'}\n`)

  const messages = [
    {
      role: 'user',
      content: `Today is ${today}.

You are an agent that monitors CSS support changes in email clients.

TASK:
1. Search for news from the past week about CSS rendering changes in these clients:
   - Gmail (desktop webmail + mobile)
   - Outlook Windows (2016, 2019, 2021)
   - Outlook.com
   - Apple Mail

2. Pay special attention to:
   - New flexbox/grid support in any client
   - Changes in border-radius handling
   - Changes in CSS variables support
   - Any breaking changes

3. Read the current compat matrix and compare.

4. Report via report_changes:
   - If changes found — details of each change with source URL
   - If nothing new — no_changes: true

Search in:
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

    console.log(`Stop reason: ${response.stop_reason}`)

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(b => b.type === 'text')?.text
      console.log('\nFinal agent report:\n', text)
      break
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue

        console.log(`\nTool: ${block.name}`)
        const result = await handleTool(block.name, block.input)

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

  // --- Process results -----------------------------------------------------

  if (!finalReport) {
    console.log('Warning: agent did not call report_changes')
    return
  }

  if (finalReport.no_changes) {
    console.log('\nNo changes found — matrix is up to date')
    return
  }

  if (!finalReport.changes?.length) {
    console.log('\nNothing new')
    return
  }

  console.log(`\nFound ${finalReport.changes.length} change(s):`)
  finalReport.changes.forEach(c => {
    console.log(`  - ${c.client}: ${c.feature} — ${c.old_status ?? '?'} -> ${c.new_status} [${c.confidence}]`)
    console.log(`    Source: ${c.source}`)
  })

  if (isDryRun) {
    console.log('\n[Dry run] — matrix not updated')
    return
  }

  await applyChangesAndCreatePR(finalReport)
}

// --- Apply changes ---------------------------------------------------------

async function applyChangesAndCreatePR(report) {
  console.log('\nUpdating compat matrix...')

  const branchName = `agent/compat-update-${Date.now()}`
  const today = new Date().toISOString().split('T')[0]

  try {
    execSync(`git checkout -b ${branchName}`)
    execSync(`node ${SYNC_SCRIPT}`)
    execSync(`git add ${COMPAT_PATH}`)
    execSync(`git commit -m "chore: update compat matrix ${today} [bot]

${report.summary}

Changes found:
${report.changes.map(c => `- ${c.client}: ${c.feature} -> ${c.new_status}`).join('\n')}

Sources:
${report.changes.map(c => `- ${c.source}`).join('\n')}"`)

    console.log('Compat matrix updated')
    console.log(`Branch: ${branchName}`)

  } catch (err) {
    console.error('Error updating matrix:', err.message)
  }
}

// --- Run ------------------------------------------------------------------

runAgent().catch(err => {
  console.error('Agent crashed:', err.message)
  process.exit(1)
})
