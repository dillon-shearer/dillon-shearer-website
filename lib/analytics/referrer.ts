/**
 * Normalizes referrer URLs to clean domain names
 *
 * Examples:
 * - https://www.google.com/search?q=test → google.com
 * - http://github.com/user/repo → github.com
 * - https://linkedin.com/in/profile/ → linkedin.com
 *
 * @param url - The referrer URL to normalize
 * @returns Normalized domain name or null if invalid
 */
export function normalizeReferrer(url: string | null): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url)
    // Remove 'www.' prefix and return clean hostname
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    // If URL parsing fails, try to extract domain from string
    // Handle cases like "google.com" without protocol
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\?#]+)/)
    if (match && match[1]) {
      return match[1]
    }
    return null
  }
}

/**
 * Categorizes referrers into common groups
 *
 * @param domain - Normalized domain name
 * @returns Category name
 */
export function categorizeReferrer(domain: string): string {
  const searchEngines = ['google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com', 'baidu.com']
  const socialMedia = [
    'facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'instagram.com',
    'reddit.com', 'pinterest.com', 'tiktok.com', 'youtube.com'
  ]
  const devPlatforms = ['github.com', 'gitlab.com', 'stackoverflow.com', 'dev.to', 'hashnode.com']

  if (searchEngines.some(engine => domain.includes(engine))) {
    return 'Search Engine'
  }
  if (socialMedia.some(social => domain.includes(social))) {
    return 'Social Media'
  }
  if (devPlatforms.some(dev => domain.includes(dev))) {
    return 'Dev Platform'
  }
  return 'Other'
}
