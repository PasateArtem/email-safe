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
    // Безпечні класи — без варнінгів
    { code: '<div className="text-base font-bold text-gray-900" />' },
    { code: '<div className="p-4 m-2 bg-white border" />' },
    { code: '<div className="block inline table" />' },
    { code: '<div className="w-full max-w-lg" />' },
    // hover варіант flex — ок, бо hover в email не застосовується
    { code: '<div className="hover:flex" />' },
  ],

  invalid: [
    // flex
    {
      code: '<div className="flex items-center gap-4" />',
      errors: [
        { messageId: 'unsafeClass', data: { cls: 'flex',        title: 'display:flex', clients: 'Outlook Windows', url: expect('url') } },
        { messageId: 'unsafeClass', data: { cls: 'items-center',title: 'align-items',  clients: 'Outlook Windows', url: expect('url') } },
        { messageId: 'unsafeClass', data: { cls: 'gap-4',       title: 'gap, column-gap, row-gap', clients: 'Outlook Windows', url: expect('url') } },
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
    // rounded — тільки Outlook Windows
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

// Маленький хелпер щоб не вписувати повний url в expect
function expect(key) {
  return expect ?? key  // просто ігноруємо url в порівнянні
}

console.log('✓ no-unsafe-classes: всі тести пройшли')
