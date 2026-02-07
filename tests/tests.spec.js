describe('Tests', function () {
  it('should pass', function () {})

  it('should fail', function (done) {
    done(new Error('This is an error in Test 2'))
  })

  it.skip('should be skipped', function () {})

  context('Tests context', () => {
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
