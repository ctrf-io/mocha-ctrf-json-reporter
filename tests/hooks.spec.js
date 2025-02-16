describe('Hooks-after each', () => {
  describe('Hook should pass', () => {
    afterEach(() => {
      console.log('This is an afterEach hook')
    })

    it('Test 1', () => {})

    it('Test 2', (done) => {
      done(new Error('This is an error in Test 2'))
    })
  })

  describe('Hook should fail', () => {
    afterEach(() => {
      throw new Error('This is an error in afterEach hook')
    })

    it('Test 1', () => {})
  })
})
