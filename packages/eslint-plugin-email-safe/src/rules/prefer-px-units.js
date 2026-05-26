/**
 * Rule: prefer-px-units
 * Warns about arbitrary values using rem/em/vh/vw in email class names
 */

const UNSAFE_UNITS = ['rem', 'em', 'vh', 'vw', 'vmin', 'vmax']
// Matches arbitrary values: w-[2rem], text-[1.5em], h-[100vh]
const ARBITRARY_REGEX = /\[([^\]]+)\]/

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Recommends px instead of rem/em/vh/vw in email class names',
    },
    messages: {
      preferPx: '"{{cls}}" uses {{unit}} — px is recommended in emails. Outlook does not support {{unit}} units.',
    },
  },

  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return
        if (!node.value) return

        const raw = (context.sourceCode ?? context.getSourceCode()).getText(node.value)
        const classes = raw.split(/\s+/)

        for (const cls of classes) {
          const match = cls.match(ARBITRARY_REGEX)
          if (!match) continue

          const value = match[1]
          const unit = UNSAFE_UNITS.find(u => value.endsWith(u))
          if (!unit) continue

          context.report({
            node,
            messageId: 'preferPx',
            data: { cls: cls.replace(/['"]/g, ''), unit },
          })
        }
      },
    }
  },
}
