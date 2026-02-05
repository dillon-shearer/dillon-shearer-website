import UAParser from 'ua-parser-js'

export function parseUserAgent(uaString: string) {
  const parser = new UAParser(uaString)
  const result = parser.getResult()
  return {
    browser: result.browser.name || 'Unknown',
    os: result.os.name || 'Unknown',
    deviceType: result.device.type || 'desktop',
  }
}

export function isBot(uaString: string): boolean {
  return /bot|crawler|spider|crawling|headless/i.test(uaString)
}
