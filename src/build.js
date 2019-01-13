const fs = require('fs')
const babel = require('@babel/core')
const roll20Transform = require('babel-transform-roll20')

function testFileExists(filePath) {
  return new Promise((resolve, reject) => {
    console.log('Loading provided script...')

    fs.access(filePath, fs.constants.R_OK, (err) => {
      if (err) {
        return reject(new Error('Provided script does not exist!'))
      }

      return resolve()
    })
  })
}

function transformFile (filePath) {
  return new Promise((resolve, reject) => {
    console.log('Transforming provided script...')

    babel.transformFile(filePath, {
      babelrc: false,
      comments: false,
      plugins: [roll20Transform]
    }, (err, result) => {
      if (err) {
        return reject(err)
      }

      return resolve(result.code)
    })
  })
}

module.exports = function build(options) {
  return testFileExists(options.script)
    .then(() => transformFile(options.script))
}
