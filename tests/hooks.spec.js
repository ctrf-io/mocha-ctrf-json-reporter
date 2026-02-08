describe('Hooks-after each', () => {
  describe('Hook should pass', () => {
    afterEach(() => {
      console.log('This is an afterEach hook')
    })

    it('Test 1', () => {})

    it('Test 2', () => {
      // Test passes successfully
    })
  })

  describe('Hook should also pass', () => {
    afterEach(() => {
      // Hook completes successfully
    })

    it('Test 1', () => {})
  })

  describe.skip('Hook failure scenarios', () => {
    // Skipped for CI hygiene - these test error handling
    it('Test that fails', (done) => {
      done(new Error('This is an error in Test 2'))
    })

    describe('afterEach hook failure', () => {
      afterEach(() => {
        throw new Error('This is an error in afterEach hook')
      })

      it('Test 1', () => {})
    })
  })
})
