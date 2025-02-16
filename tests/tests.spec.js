describe('Tests', function () {
  it('should pass', function () {})

  it('should fail', function (done) {
    done(new Error('This is an error in Test 2'))
  })

  it.skip('should be skipped', function () {})
})
