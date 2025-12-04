/**
 * Enhanced Image Processing for News Articles
 * Addresses blurry image issues by:
 * 1. Improving image URL extraction
 * 2. Adding image quality optimization
 * 3. Better fallback handling
 */
class ImageProcessor {
  constructor() {
    this.baseURLs = {
      'ESPN': 'https://www.espn.com',
      'NFL.com': 'https://www.nfl.com',
      'CBS Sports': 'https://www.cbssports.com',
      'Yahoo Sports': 'https://sports.yahoo.com',
      'Rotoworld': 'https://www.rotoworld.com'
    };
  }
  /**
   * Extract and optimize image URL from DOM element
   * @param {Object} $element - jQuery element
   * @param {string} source - News source
   * @returns {string|null} - Optimized image URL
   */
  extractImageUrl($element, source) {
    try {
      const baseURL = this.baseURLs[source] || 'https://example.com'
      // Try multiple image selectors for better coverage
      const imgSelectors = [
        'img',
        'picture img',
        '.image img',
        '.photo img',
        '.media img',
        '[data-testid*="image"] img',
        '[class*="image"] img',
        '[class*="photo"] img',
        '[class*="media"] img'
      ]
      let imgElement = null
      for (const selector of imgSelectors) {
        imgElement = $element.find(selector).first()
        if (imgElement.length > 0) break
      }
      if (!imgElement || imgElement.length === 0) {
        return null
      }
      // Try multiple attributes for image URL
      const urlAttributes = ['data-src', 'data-lazy-src', 'data-original', 'src', 'data-srcset']
      let imageUrl = null
      for (const attr of urlAttributes) {
        imageUrl = imgElement.attr(attr)
        // Skip placeholder images
        if (imageUrl && !imageUrl.includes('base64') && !imageUrl.includes('data:image') && 
            !imageUrl.includes('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')) {
          break
        } else if (imageUrl) {
          // Reset if placeholder found
          imageUrl = null
        }
      }
      if (!imageUrl) {
        return null
      }
      // Handle srcset (responsive images)
      const srcset = imgElement.attr('srcset')
      if (srcset && !imageUrl.includes('http')) {
        // Extract highest resolution from srcset
        const srcsetUrls = srcset.split(',').map(s => s.trim())
        const highestRes = srcsetUrls.reduce((best, current) => {
          const bestMatch = best.match(/(\d+)w/)
          const currentMatch = current.match(/(\d+)w/)
          if (bestMatch && currentMatch) {
            return parseInt(currentMatch[1]) > parseInt(bestMatch[1]) ? current : best
          }
          return best
        })
        imageUrl = highestRes.split(' ')[0]
      }
      // Make URL absolute
      if (imageUrl.startsWith('/')) {
        imageUrl = `${baseURL}${imageUrl}`
      } else if (imageUrl.startsWith('//')) {
        imageUrl = `https:${imageUrl}`
      }
      
      // Final check: reject placeholder images
      if (imageUrl.includes('base64') || 
          imageUrl.includes('data:image') ||
          imageUrl.includes('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')) {
        return null
      }
      
      // Optimize image URL for better quality
      imageUrl = this.optimizeImageUrl(imageUrl, source)
      return imageUrl
    } catch (error) {
      return null
    }
  }
  /**
   * Optimize image URL for better quality
   * @param {string} url - Original image URL
   * @param {string} source - News source
   * @returns {string} - Optimized URL
   */
  optimizeImageUrl(url, source) {
    try {
      // ESPN optimizations
      if (source === 'ESPN') {
        // ESPN often has multiple sizes available
        if (url.includes('a.espncdn.com')) {
          // Try to get higher resolution version
          url = url.replace(/\/\d+x\d+\//, '/800x600/') // Request 800x600 instead of smaller
          url = url.replace(/\/\d+x\d+\./, '/800x600.') // Handle different URL patterns
        }
      }
      // NFL.com optimizations
      if (source === 'NFL.com') {
        if (url.includes('static.nfl.com')) {
          // NFL.com images often have size parameters
          url = url.replace(/width=\d+/, 'width=800')
          url = url.replace(/height=\d+/, 'height=600')
        }
      }
      // CBS Sports optimizations
      if (source === 'CBS Sports') {
        if (url.includes('sportshub.cbsistatic.com')) {
          // CBS often has size parameters in URL
          url = url.replace(/\/\d+x\d+\//, '/800x600/')
        }
      }
      // ESPN optimizations
      if (source === 'ESPN') {
        if (url.includes('espncdn.com')) {
          // Try to get larger version
          url = url.replace(/\/\d+x\d+\//, '/600x400/')
        }
      }
      // Yahoo Sports optimizations
      if (source === 'Yahoo Sports') {
        if (url.includes('s.yimg.com')) {
          // Yahoo images often have size parameters
          url = url.replace(/\/\d+x\d+\//, '/800x600/')
        }
      }
      return url
    } catch (error) {
      return url
    }
  }
  /**
   * Validate image URL and check if it's accessible
   * @param {string} url - Image URL to validate
   * @returns {Promise<boolean>} - Whether URL is valid
   */
  async validateImageUrl(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok
    } catch (error) {
      return false
    }
  }
  /**
   * Get fallback image URL for a source
   * @param {string} source - News source
   * @returns {string} - Fallback image URL
   */
  getFallbackImageUrl(source) {
    const fallbacks = {
      'ESPN': 'https://a.espncdn.com/i/espn/espn_logos/espn_red_logo.svg',
      'NFL.com': 'https://static.nfl.com/static/content/public/static/img/logos/nfl-immersive-logo.svg',
      'CBS Sports': 'https://sportshub.cbsistatic.com/i/r/2020/01/15/8a0a0a0a-0a0a-0a0a-0a0a-0a0a0a0a0a0a/cbs-sports-logo.svg',
      'Yahoo Sports': 'https://s.yimg.com/cv/apiv2/sports/images/logos/sports/yahoo-sports-logo.svg',
      'Rotoworld': 'https://www.rotoworld.com/images/logos/rotoworld-logo.svg'
    }
    return fallbacks[source] || `https://ui-avatars.com/api/?name=${encodeURIComponent(source)}&background=random&size=128`
  }
}
module.exports = ImageProcessor
