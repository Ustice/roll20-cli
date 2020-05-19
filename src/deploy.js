const jsdom = require('jsdom')
const puppeteer = require('puppeteer')
const request = require('request')

const parseCookie = require('cookie').parse

function getRoll20SessionCookie(email, password) {
  return new Promise((resolve, reject) => {
    console.log('Authenticating with Roll20.net...')

    request.post('https://app.roll20.net/sessions/create', {
      form: {
        email,
        password
      }
    }, (err, httpResponse) => {
      if (err) {
        return reject(err)
      }

      if (
        httpResponse.statusCode !== 303 ||
        (
          httpResponse.headers['location'] !== 'https://app.roll20.net/sessions/new' &&
          httpResponse.headers['location'] !== 'https://app.roll20.net/home/'
        )
      ) {
        return reject(new Error('Invalid Roll20 credentials! ' + JSON.stringify(httpResponse, null, 2)))
      }

      const cookies = httpResponse.headers['set-cookie'].reduce((cookies, setCookie) => {
        const cookie = parseCookie(setCookie)
        delete cookie.domain
        delete cookie.path
        delete cookie.expires

        return [
          ...cookies,
          ...Object.keys(cookie).map(value => `${value}=${cookie[value]}`)
        ]
      }, []).join('; ')

      resolve(cookies)
    })
  })
}

function getRoll20ScriptsForCampaign(cookie, campaignId) {
  console.log('Loading existing Roll20 campaign scripts...')

  return new Promise((resolve, reject) => {
    request.get({
      url: `https://app.roll20.net/campaigns/scripts/${campaignId}`,
      headers: {
        'Cookie': cookie
      }
    }, (err, httpResponse, body) => {
      if (err) {
        return reject(err)
      }

      resolve(body)
    })
  })
}

function getScriptFromDOM(html, campaignId, scriptName) {
  const virtualConsole = new jsdom.VirtualConsole();
  const dom = new jsdom.JSDOM(html, {
    url: `https://app.roll20.net/campaigns/scripts/${campaignId}`,
    runScripts: 'dangerously',
    virtualConsole
  })

  if (dom.window.currentscripts && !dom.window.currentscripts.includes(scriptName)) {
    console.log('No existing Roll20 campaign script found.')
    console.log('Creating a new Roll20 campaign script...')
    return 'new'
  }

  const scriptId = dom.window.document.querySelector(`[data-scriptname="${scriptName}"]`).id.slice('script-'.length)

  dom.window.close()

  console.log('Existing Roll20 campaign script found!')

  return scriptId
}

function saveScriptToRoll20(code, campaignId, scriptId, cookie, scriptName) {
  console.log(`Deploying script #${scriptId} as ${scriptName}...`)

  return new Promise((resolve, reject) => {
    request.post({
      url: `https://app.roll20.net/campaigns/save_script/${campaignId}/${scriptId}`,
      headers: {
        'Cookie': cookie
      },
      formData: {
        name: scriptName,
        content: code
      }
    }, (err, httpResponse, body) => {
      if (err) {
        return reject(err)
      }

      return resolve(body)
    })
  })
}

const watchLogs = async ({
  campaign, // Campaign id from .env
}) => {

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: true,
  })
  const page = await browser.newPage()

  // Save for debug flag
  // page.on('console', msg => console.log('PAGE LOG:', msg.text()))

  await page.goto('https://app.roll20.net/sessions/new')

  await page.type('#email', process.env.ROLL20_USERNAME)
  await page.type('#password', process.env.ROLL20_PASSWORD)
  await page.waitFor('#login')

  console.log('Logging in.')

  const loginPromise = page.waitForNavigation({ timeout: 30000, waitUntil: 'load' })
  await page.click('#login')

  await loginPromise

  console.log('Authenticated')

  await page.goto(`https://app.roll20.net/campaigns/scripts/${campaign}`)

  console.log('Navigating to campaign')

  await page.waitFor(() => {
    return !!window.ace
  }, {
    timeout: 30 * 1000
  })

  // Pull out for scirpt upload
  // const scripts = await page.evaluate(() => {
  //   // Destructured into an array rather than a NodeList
  //   const scriptTabElements = [...document.querySelectorAll('[data-scriptname]')]

  //   return scriptTabElements.map(n => ({
  //     id: n.getAttribute('id').replace(/^script-/, ''),
  //     name: n.getAttribute('data-scriptname'),
  //   }))
  // })

  // const cookies = await page.cookies()

  await page.exposeFunction('onEditorChange', (lines) => {
    console.log(lines.join('\n'))
  })

  console.log('Connecting to API Output Console.')

  await page.evaluate(() => {
    console.log('Connecting to Ace Code Editor')

    const editor = window.ace.edit(document.getElementById('apiconsole'))

    editor.$blockScrolling = Infinity

    const editorDocument = editor
      .getSession()
      .getDocument()

    editorDocument.on('change', (changes) => window.onEditorChange(changes.lines))

    document.addEventListener('onEditorChange', window.onEditorChange)
  })

  page.on('change', (changes) => {
    console.log(changes.getAllLines())
  })
}

module.exports = async function deploy(code, options) {
  const { output: scriptName, watch } = options

  console.log(`Saving script as ${scriptName}`)

  const { username, password, campaign} = options && options.roll20 ? options.roll20 : {}
  const cookie = await getRoll20SessionCookie(username, password)
  const html = await getRoll20ScriptsForCampaign(cookie, campaign)
  const scriptId = getScriptFromDOM(html, campaign, scriptName)
  const savedResponse = await saveScriptToRoll20(code, campaign, scriptId, cookie, scriptName)

  console.log('Deployed script to Roll20!')


  if (watch) {
    console.log('Watching Roll20 console')
    await watchLogs({ html, campaign, code })
  }

  return savedResponse
}
