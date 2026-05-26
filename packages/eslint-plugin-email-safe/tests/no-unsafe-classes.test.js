const { RuleTester } = require('eslint')
const rule = require('../src/rules/no-unsafe-classes')

const tester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
      ecmaVersion: 2020,
    },
  },
})

tester.run('no-unsafe-classes', rule, {
  valid: [
    // Safe classes — no warnings expected
    { code: '<div className="text-base font-bold text-gray-900" />' },
    { code: '<div className="p-4 m-2 bg-white border" />' },
    { code: '<div className="block inline table" />' },
    { code: '<div className="w-full max-w-lg" />' },
    // hover:flex is fine — hover states don't apply in email anyway
    { code: '<div className="hover:flex" />' },
  ],

  invalid: [
    // flex
    {
      code: '<div className="flex items-center gap-4" />',
      errors: [
        { messageId: 'unsafeClass' },
        { messageId: 'unsafeClass' },
        { messageId: 'unsafeClass' },
      ],
    },
    // grid
    {
      code: '<div className="grid grid-cols-3" />',
      errors: [
        { messageId: 'unsafeClass' },
        { messageId: 'unsafeClass' },
      ],
    },
    // rounded — Outlook Windows only
    {
      code: '<div className="rounded-lg" />',
      errors: [{ messageId: 'unsafeClass' }],
    },
    // animate
    {
      code: '<div className="animate-pulse" />',
      errors: [{ messageId: 'unsafeClass' }],
    },
    // template literal
    {
      code: '<div className={`flex ${isActive ? "bg-blue" : "bg-gray"}`} />',
      errors: [{ messageId: 'unsafeClass' }],
    },
    // conditional expression
    {
      code: '<div className={isRow ? "flex-row" : "flex-col"} />',
      errors: [
        { messageId: 'unsafeClass' },
        { messageId: 'unsafeClass' },
      ],
    },
  ],
})

console.log('All no-unsafe-classes tests passed')
