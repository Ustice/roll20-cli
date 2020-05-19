const build = require('./build')
const deploy = require('./deploy')

module.exports = async (options) => {
  try {
    const code = await build(options)
    const response = await deploy(code, options)

    return response
  }
  catch (error) {
    console.error(error.stack)
    return process.exit(1)
  }
}
