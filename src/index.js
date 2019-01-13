const build = require('./build')
const deploy = require('./deploy')

module.exports = function (options) {
  return build(options)
    .then(code => deploy(code, options))
    .catch(err => {
      console.error(err.message)
      process.exitCode = 1
      return
    })
}
