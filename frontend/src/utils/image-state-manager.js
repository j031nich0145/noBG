/**
 * Image State Manager - Sync main image between Single and Batch modes
 */

const MAIN_IMAGE_KEY = 'nobg_main_image'
const MAIN_IMAGE_DIMENSIONS_KEY = 'nobg_main_image_dimensions'
const MAIN_IMAGE_FILENAME_KEY = 'nobg_main_image_filename'
const PROCESSED_IMAGE_KEY = 'nobg_processed_image'
const PROCESSED_IMAGE_INFO_KEY = 'nobg_processed_image_info'
const BATCH_IMAGES_KEY = 'nobg_batch_images'

// Maximum dimensions for stored images to prevent quota exceeded
const MAX_STORAGE_DIMENSION = 2000
const STORAGE_QUALITY = 0.85

/**
 * Compress image for storage to prevent quota exceeded errors
 * @param {File} file - Image file
 * @param {Object} dimensions - { width, height }
 * @returns {Promise<string>} - Compressed base64 data URL
 */
async function compressImageForStorage(file, dimensions) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      try {
        const { width, height } = dimensions
        
        // Calculate scaled dimensions if image is too large
        let targetWidth = width
        let targetHeight = height
        
        if (width > MAX_STORAGE_DIMENSION || height > MAX_STORAGE_DIMENSION) {
          const scale = MAX_STORAGE_DIMENSION / Math.max(width, height)
          targetWidth = Math.round(width * scale)
          targetHeight = Math.round(height * scale)
          console.log(`Compressing image from ${width}×${height} to ${targetWidth}×${targetHeight} for storage`)
        }
        
        // Create canvas and draw scaled image
        const canvas = document.createElement('canvas')
        canvas.width = targetWidth
        canvas.height = targetHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
        
        // Convert to base64 with quality compression
        const base64 = canvas.toDataURL('image/jpeg', STORAGE_QUALITY)
        
        URL.revokeObjectURL(url)
        resolve(base64)
      } catch (error) {
        URL.revokeObjectURL(url)
        reject(error)
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for compression'))
    }
    
    img.src = url
  })
}

/**
 * Save main image to localStorage
 * @param {File} file - Image file
 * @param {Object} dimensions - { width, height }
 * @param {string} filename - Optional filename to store
 */
export async function saveMainImage(file, dimensions, filename = null) {
  try {
    // Compress image before saving
    const base64 = await compressImageForStorage(file, dimensions)
    
    try {
      localStorage.setItem(MAIN_IMAGE_KEY, base64)
      localStorage.setItem(MAIN_IMAGE_DIMENSIONS_KEY, JSON.stringify(dimensions))
      if (filename) {
        localStorage.setItem(MAIN_IMAGE_FILENAME_KEY, filename)
      }
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded for main image, clearing old data')
        // Clear processed image to make space for main image (main image is more important)
        localStorage.removeItem(PROCESSED_IMAGE_KEY)
        localStorage.removeItem(PROCESSED_IMAGE_INFO_KEY)
        try {
          // Try again after clearing
          localStorage.setItem(MAIN_IMAGE_KEY, base64)
          localStorage.setItem(MAIN_IMAGE_DIMENSIONS_KEY, JSON.stringify(dimensions))
          if (filename) {
            localStorage.setItem(MAIN_IMAGE_FILENAME_KEY, filename)
          }
          console.log('Successfully saved main image after clearing space')
        } catch (retryError) {
          console.error('Still cannot save main image after clearing space:', retryError)
          // Last resort: clear batch images too
          localStorage.removeItem(BATCH_IMAGES_KEY)
          try {
            localStorage.setItem(MAIN_IMAGE_KEY, base64)
            localStorage.setItem(MAIN_IMAGE_DIMENSIONS_KEY, JSON.stringify(dimensions))
            if (filename) {
              localStorage.setItem(MAIN_IMAGE_FILENAME_KEY, filename)
            }
            console.log('Successfully saved main image after clearing all cached data')
          } catch (finalError) {
            console.error('Cannot save main image even after clearing all data:', finalError)
          }
        }
      } else {
        console.error('Failed to save main image to localStorage:', error)
      }
    }
  } catch (error) {
    console.error('Failed to compress and save main image:', error)
  }
}

/**
 * Load main image from localStorage
 * @returns {Promise<Object|null>} - { file: File, dimensions: { width, height }, filename: string, blob: Blob } or null
 */
export async function loadMainImage() {
  try {
    const base64 = localStorage.getItem(MAIN_IMAGE_KEY)
    const dimensionsStr = localStorage.getItem(MAIN_IMAGE_DIMENSIONS_KEY)
    const filename = localStorage.getItem(MAIN_IMAGE_FILENAME_KEY)
    
    if (!base64 || !dimensionsStr) {
      return null
    }
    
    // Convert base64 back to File
    const dimensions = JSON.parse(dimensionsStr)
    
    // Convert base64 to blob then to File
    const response = await fetch(base64)
    const blob = await response.blob()
    const file = new File([blob], filename || 'main-image.png', { type: blob.type })
    
    return { 
      file, 
      dimensions, 
      filename: filename || 'image.png',
      blob
    }
  } catch (error) {
    console.error('Failed to load main image:', error)
    return null
  }
}

/**
 * Check if main image exists in localStorage
 * @returns {boolean}
 */
export function hasMainImage() {
  return !!localStorage.getItem(MAIN_IMAGE_KEY)
}

/**
 * Clear main image from localStorage
 */
export function clearMainImage() {
  try {
    localStorage.removeItem(MAIN_IMAGE_KEY)
    localStorage.removeItem(MAIN_IMAGE_DIMENSIONS_KEY)
    localStorage.removeItem(MAIN_IMAGE_FILENAME_KEY)
  } catch (error) {
    console.error('Failed to clear main image:', error)
  }
}

/**
 * Get main image URL for display (synchronous)
 * @returns {string|null} - Data URL or null
 */
export function getMainImageUrl() {
  try {
    return localStorage.getItem(MAIN_IMAGE_KEY)
  } catch (error) {
    console.error('Failed to get main image URL:', error)
    return null
  }
}

/**
 * Save processed image to localStorage
 * @param {Blob} blob - Blob object of processed image
 * @param {Object} imageInfo - { originalDimensions, threshold, removalMethod, edgeFeather, liveUpdate, cropState? }
 */
export async function saveProcessedImage(blob, imageInfo) {
  try {
    // Convert blob to base64 - no need to fetch since we have the blob directly
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const base64 = reader.result
          localStorage.setItem(PROCESSED_IMAGE_KEY, base64)
          localStorage.setItem(PROCESSED_IMAGE_INFO_KEY, JSON.stringify(imageInfo))
          resolve()
        } catch (error) {
          // Handle quota exceeded
          if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded for processed image, clearing old data')
            // Clear old processed image
            localStorage.removeItem(PROCESSED_IMAGE_KEY)
            // Try again with just the info (more important than the image itself)
            try {
              localStorage.setItem(PROCESSED_IMAGE_INFO_KEY, JSON.stringify(imageInfo))
              console.warn('Saved processed image info but not image data due to quota')
              resolve() // Resolve anyway - info is more important
            } catch (retryError) {
              console.error('Cannot save even processed image info:', retryError)
              reject(retryError)
            }
          } else {
            console.error('Failed to save processed image to localStorage:', error)
            reject(error)
          }
        }
      }
      reader.onerror = () => {
        console.error('Failed to read blob')
        reject(new Error('Failed to read blob'))
      }
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Failed to save processed image:', error)
  }
}

/**
 * Load processed image from localStorage
 * @returns {Promise<Object|null>} - { imageUrl: string, imageInfo: Object } or null
 */
export async function loadProcessedImage() {
  try {
    const base64 = localStorage.getItem(PROCESSED_IMAGE_KEY)
    const infoStr = localStorage.getItem(PROCESSED_IMAGE_INFO_KEY)
    
    if (!base64 || !infoStr) {
      return null
    }
    
    const imageInfo = JSON.parse(infoStr)
    
    return {
      imageUrl: base64, // base64 data URL
      imageInfo
    }
  } catch (error) {
    console.error('Failed to load processed image:', error)
    return null
  }
}

/**
 * Get processed image info (synchronous)
 * @returns {Object|null} - Image info object or null
 */
export function getProcessedImageInfo() {
  try {
    const infoStr = localStorage.getItem(PROCESSED_IMAGE_INFO_KEY)
    return infoStr ? JSON.parse(infoStr) : null
  } catch (error) {
    console.error('Failed to get processed image info:', error)
    return null
  }
}

/**
 * Get processed image URL (synchronous)
 * @returns {string|null} - Base64 data URL or null
 */
export function getProcessedImageUrl() {
  try {
    return localStorage.getItem(PROCESSED_IMAGE_KEY)
  } catch (error) {
    console.error('Failed to get processed image URL:', error)
    return null
  }
}

/**
 * Clear processed image from localStorage
 */
export function clearProcessedImage() {
  try {
    localStorage.removeItem(PROCESSED_IMAGE_KEY)
    localStorage.removeItem(PROCESSED_IMAGE_INFO_KEY)
  } catch (error) {
    console.error('Failed to clear processed image:', error)
  }
}

/**
 * Convert File to base64
 * @param {File} file - File object
 * @returns {Promise<string>} - Base64 data URL
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Convert base64 to Blob
 * @param {string} base64 - Base64 data URL
 * @param {string} mimeType - MIME type
 * @returns {Blob} - Blob object
 */
function base64ToBlob(base64, mimeType) {
  const byteString = atob(base64.split(',')[1])
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeType })
}

/**
 * Save batch images to localStorage with compression
 * @param {File[]} files - Array of File objects
 */
export async function saveBatchImages(files) {
  try {
    if (!files || files.length === 0) {
      localStorage.removeItem(BATCH_IMAGES_KEY)
      return
    }

    const fileData = await Promise.all(files.map(async (file) => {
      // Get image dimensions
      const dimensions = await new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = () => resolve({ width: 800, height: 600 }) // fallback
        img.src = URL.createObjectURL(file)
      })
      
      // Compress each batch image
      const base64 = await compressImageForStorage(file, dimensions)
      return {
        base64,
        name: file.name,
        type: 'image/jpeg', // All compressed to JPEG
        lastModified: file.lastModified
      }
    }))
    
    try {
      localStorage.setItem(BATCH_IMAGES_KEY, JSON.stringify(fileData))
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded for batch images, saving fewer images')
        // Try saving only first half of images
        const halfData = fileData.slice(0, Math.ceil(fileData.length / 2))
        try {
          localStorage.setItem(BATCH_IMAGES_KEY, JSON.stringify(halfData))
          console.log(`Saved ${halfData.length} of ${fileData.length} batch images due to quota`)
        } catch (retryError) {
          console.error('Cannot save batch images even with reduced count:', retryError)
        }
      } else {
        throw error
      }
    }
  } catch (error) {
    console.error('Failed to save batch images:', error)
  }
}

/**
 * Load batch images from localStorage
 * @returns {Promise<File[]>} - Array of File objects
 */
export async function loadBatchImages() {
  try {
    const saved = localStorage.getItem(BATCH_IMAGES_KEY)
    if (!saved) {
      return []
    }
    
    const fileData = JSON.parse(saved)
    const files = fileData.map(data => {
      const blob = base64ToBlob(data.base64, data.type)
      return new File([blob], data.name, { 
        type: data.type, 
        lastModified: data.lastModified || Date.now()
      })
    })
    
    return files
  } catch (error) {
    console.error('Failed to load batch images:', error)
    return []
  }
}

/**
 * Clear batch images from localStorage
 */
export function clearBatchImages() {
  try {
    localStorage.removeItem(BATCH_IMAGES_KEY)
  } catch (error) {
    console.error('Failed to clear batch images:', error)
  }
}

