/**
 * Правило: no-unsafe-classes
 * Попереджає про Tailwind класи що не підтримуються в email клієнтах
 */

const compat = require('../data/compat')

// Перетворює glob-паттерн на RegExp: 'flex-*' → /^flex-.+$/
function patternToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  return new RegExp('^' + escaped.replace(/\*/g, '.+') + '$')
}

// Кешуємо regex щоб не перекомпільовувати щоразу
const compiledPatterns = Object.entries(compat).map(([pattern, meta]) => ({
  regex: patternToRegex(pattern),
  pattern,
  meta,
}))

function findUnsafe(className) {
  return compiledPatterns.find(({ regex }) => regex.test(className))
}

// Витягує рядки класів з різних форм JSX запису
function extractClassStrings(node) {
  // className="flex text-base"
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return [node.value]
  }
  // className={`flex ${someVar}`}
  if (node.type === 'TemplateLiteral') {
    return node.quasis.map(q => q.value.cooked || '').filter(Boolean)
  }
  // className={condition ? 'flex' : 'block'}
  if (node.type === 'ConditionalExpression') {
    return [
      ...extractClassStrings(node.consequent),
      ...extractClassStrings(node.alternate),
    ]
  }
  // className={cn('flex', isActive && 'bg-blue-500')}
  if (node.type === 'CallExpression') {
    return node.arguments.flatMap(arg => extractClassStrings(arg))
  }
  // className={['flex', 'text-base']}
  if (node.type === 'ArrayExpression') {
    return node.elements.filter(Boolean).flatMap(el => extractClassStrings(el))
  }
  return []
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Попереджає про Tailwind CSS класи що не працюють в email клієнтах',
      url: 'https://github.com/yourusername/email-safe',
    },
    schema: [
      {
        type: 'object',
        properties: {
          // Фільтрувати попередження тільки для певних клієнтів
          clients: {
            type: 'array',
            items: { type: 'string' },
            default: ['Outlook Windows'],
          },
          // 'warn' або 'error'
          severity: {
            type: 'string',
            enum: ['warn', 'error'],
            default: 'warn',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unsafeClass:
        '"{{cls}}" ({{title}}) не підтримується в: {{clients}}. Деталі: {{url}}',
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const targetClients = options.clients || ['Outlook Windows']

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return
        if (!node.value) return

        const valueNode =
          node.value.type === 'JSXExpressionContainer'
            ? node.value.expression
            : node.value

        const classStrings = extractClassStrings(valueNode)

        for (const classString of classStrings) {
          const classes = classString.split(/\s+/).filter(Boolean)

          for (const cls of classes) {
            // Підтримуємо Tailwind варіанти: 'hover:flex', 'sm:flex', 'email:flex'
            const baseClass = cls.includes(':') ? cls.split(':').pop() : cls
            const match = findUnsafe(baseClass)
            if (!match) continue

            // Якщо юзер налаштував фільтр по клієнтах — перевіряємо
            const relevantClients = match.meta.unsupportedIn.filter(c =>
              targetClients.some(t => c.toLowerCase().includes(t.toLowerCase()))
            )
            if (relevantClients.length === 0) continue

            context.report({
              node,
              messageId: 'unsafeClass',
              data: {
                cls,
                title: match.meta.title,
                clients: relevantClients.join(', '),
                url: match.meta.url,
              },
            })
          }
        }
      },
    }
  },
}
