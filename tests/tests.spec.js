describe('Tests', function () {
  it('should pass', function () {})

  it('should fail', function (done) {
    done(new Error('This is an error in Test 2'))
  })

  it.skip('should be skipped', function () {}).describe(
    'Will be marked as pending.'
  )

  context('Tests context', () => {
    beforeEach(() => {
      this.nonExistentProperty.AnotherOneMissing = 123456
    })

    it('should pass', function () {}).describe('Will be marked as skipped.')

    it('should fail', function (done) {
      done(new Error('This is an error in Test 4'))
    }).describe('Will be marked as skipped.')

    it.skip('should be skipped', function () {}).describe(
      'Will be marked as skipped.'
    )
  })
})
