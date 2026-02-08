describe('Tests', function () {
  it('should pass', function () {})

  it('should also pass', function () {
    // Test passes successfully
  })

  it.skip('should be skipped', function () {})

  context('Tests context', () => {
    beforeEach(function () {
      this.testProperty = 123456
    })

    it('should pass', function () {
      // Uses beforeEach property
    })

    it('should also pass', function () {
      // Test passes successfully
    })

    it.skip('should be skipped', function () {})
  })

  context.skip('Error handling scenarios', () => {
    // Skipped for CI hygiene - these test error handling
    it('should fail', function (done) {
      done(new Error('This is an error in Test 2'))
    })

    context('beforeEach failures', () => {
      beforeEach(() => {
        this.nonExistentProperty.AnotherOneMissing = 123456
      })

      it('should pass', function () {})

      it('should fail', function (done) {
        done(new Error('This is an error in Test 4'))
      })

      it.skip('should be skipped', function () {})
    })
  })
})
