const test = require('tap').test

test('Sanity Checks', t => {
  let api = require('../')

  t.ok(typeof api === 'function', 'Plugin recognized.')

  t.end()
})
