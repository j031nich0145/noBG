/**
 * Client-side background removal using Canvas API
 * Works entirely in the browser - no server needed for basic methods
 */

/**
 * Remove background from an image using Canvas API
 * @param {File|string} imageSource - Image file or data URL
 * @param {number} threshold - Sensitivity threshold (0-100), higher = more aggressive removal
 * @param {string} method - 'edge-detect', 'color-key', or 'luminance'
 * @param {number} edgeFeather - Edge feathering amount (0-10)
 * @param {string} backgroundColor - Background color for color-key method (hex)
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<Blob>} - Processed image as blob (PNG with transparency)
 */
export async function removeBackground(
  imageSource, 
  threshold = 50, 
  method = 'edge-detect', 
  edgeFeather = 2,
  backgroundColor = '#ffffff',
  onProgress
) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      try {
        const width = img.width
        const height = img.height
        
        if (onProgress) onProgress(10)
        
        // Create canvas for processing
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        
        // Draw original image
        ctx.drawImage(img, 0, 0)
        
        if (onProgress) onProgress(20)
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data
        
        // Create alpha mask based on method
        let alphaMask
        
        if (method === 'color-key') {
          alphaMask = createColorKeyMask(data, width, height, threshold, backgroundColor, onProgress)
        } else if (method === 'luminance') {
          alphaMask = createLuminanceMask(data, width, height, threshold, onProgress)
        } else {
          // Default: edge-detect with flood fill
          alphaMask = createEdgeDetectMask(data, width, height, threshold, onProgress)
        }
        
        if (onProgress) onProgress(70)
        
        // Apply edge feathering if requested
        if (edgeFeather > 0) {
          alphaMask = applyEdgeFeather(alphaMask, width, height, edgeFeather)
        }
        
        if (onProgress) onProgress(85)
        
        // Apply alpha mask to image data
        for (let i = 0; i < alphaMask.length; i++) {
          data[i * 4 + 3] = alphaMask[i]
        }
        
        // Put modified image data back
        ctx.putImageData(imageData, 0, 0)
        
        if (onProgress) onProgress(95)
        
        // Convert to blob (always PNG for transparency)
        canvas.toBlob((blob) => {
          if (onProgress) onProgress(100)
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create image blob'))
          }
        }, 'image/png')
        
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }
    
    // Set image source
    if (imageSource instanceof File) {
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target.result
      }
      reader.onerror = () => {
        reject(new Error('Failed to read image file'))
      }
      reader.readAsDataURL(imageSource)
    } else {
      img.src = imageSource
    }
  })
}

/**
 * Create alpha mask using edge detection and flood fill from corners
 * @param {Uint8ClampedArray} data - Image data array
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} threshold - Sensitivity (0-100)
 * @param {Function} onProgress - Progress callback
 * @returns {Uint8Array} - Alpha mask (0 = transparent, 255 = opaque)
 */
function createEdgeDetectMask(data, width, height, threshold, onProgress) {
  const mask = new Uint8Array(width * height).fill(255)
  
  // Convert threshold to tolerance (0-100 -> 0-255)
  const tolerance = Math.round((threshold / 100) * 255)
  
  // Get colors at corners for flood fill starting points
  const corners = [
    { x: 0, y: 0 },
    { x: width - 1, y: 0 },
    { x: 0, y: height - 1 },
    { x: width - 1, y: height - 1 }
  ]
  
  // Flood fill from each corner
  for (const corner of corners) {
    const idx = (corner.y * width + corner.x) * 4
    const seedColor = {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2]
    }
    
    floodFill(data, mask, width, height, corner.x, corner.y, seedColor, tolerance)
  }
  
  if (onProgress) onProgress(50)
  
  // Also flood fill from edges (not just corners) for better coverage
  const edgePoints = []
  
  // Top and bottom edges
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 20))) {
    edgePoints.push({ x, y: 0 })
    edgePoints.push({ x, y: height - 1 })
  }
  
  // Left and right edges
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 20))) {
    edgePoints.push({ x: 0, y })
    edgePoints.push({ x: width - 1, y })
  }
  
  for (const point of edgePoints) {
    const idx = (point.y * width + point.x) * 4
    const seedColor = {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2]
    }
    
    floodFill(data, mask, width, height, point.x, point.y, seedColor, tolerance)
  }
  
  if (onProgress) onProgress(60)
  
  return mask
}

/**
 * Flood fill algorithm to mark background pixels
 * @param {Uint8ClampedArray} data - Image data
 * @param {Uint8Array} mask - Alpha mask to modify
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} startX - Starting X coordinate
 * @param {number} startY - Starting Y coordinate
 * @param {Object} seedColor - { r, g, b } seed color
 * @param {number} tolerance - Color tolerance
 */
function floodFill(data, mask, width, height, startX, startY, seedColor, tolerance) {
  const stack = [{ x: startX, y: startY }]
  const visited = new Set()
  
  while (stack.length > 0) {
    const { x, y } = stack.pop()
    
    // Bounds check
    if (x < 0 || x >= width || y < 0 || y >= height) continue
    
    const key = y * width + x
    
    // Skip if already visited
    if (visited.has(key)) continue
    visited.add(key)
    
    const idx = key * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    
    // Check if color is similar to seed color
    const diff = Math.abs(r - seedColor.r) + Math.abs(g - seedColor.g) + Math.abs(b - seedColor.b)
    
    if (diff <= tolerance * 3) {
      // Mark as transparent (background)
      mask[key] = 0
      
      // Add neighbors to stack
      stack.push({ x: x + 1, y })
      stack.push({ x: x - 1, y })
      stack.push({ x, y: y + 1 })
      stack.push({ x, y: y - 1 })
    }
  }
}

/**
 * Create alpha mask using color key (chroma key style)
 * @param {Uint8ClampedArray} data - Image data array
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} threshold - Sensitivity (0-100)
 * @param {string} backgroundColor - Background color (hex)
 * @param {Function} onProgress - Progress callback
 * @returns {Uint8Array} - Alpha mask
 */
function createColorKeyMask(data, width, height, threshold, backgroundColor, onProgress) {
  const mask = new Uint8Array(width * height)
  
  // Parse background color
  const bgColor = hexToRgb(backgroundColor)
  
  // Convert threshold to tolerance
  const tolerance = Math.round((threshold / 100) * 255)
  
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    
    // Calculate color difference
    const diff = Math.abs(r - bgColor.r) + Math.abs(g - bgColor.g) + Math.abs(b - bgColor.b)
    
    if (diff <= tolerance * 3) {
      // Similar to background - make transparent
      mask[i] = 0
    } else {
      // Different from background - keep opaque
      mask[i] = 255
    }
    
    if (onProgress && i % 10000 === 0) {
      onProgress(30 + Math.floor((i / (width * height)) * 30))
    }
  }
  
  return mask
}

/**
 * Create alpha mask using luminance (brightness) threshold
 * Useful for removing white or black backgrounds
 * @param {Uint8ClampedArray} data - Image data array
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} threshold - Sensitivity (0-100)
 * @param {Function} onProgress - Progress callback
 * @returns {Uint8Array} - Alpha mask
 */
function createLuminanceMask(data, width, height, threshold, onProgress) {
  const mask = new Uint8Array(width * height)
  
  // Convert threshold to luminance cutoff (0-100 -> 0-255)
  // Higher threshold = remove brighter colors
  const luminanceCutoff = Math.round((threshold / 100) * 255)
  
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    
    // Calculate luminance (perceived brightness)
    const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
    
    if (luminance >= luminanceCutoff) {
      // Bright pixel - make transparent
      mask[i] = 0
    } else {
      // Dark pixel - keep opaque
      mask[i] = 255
    }
    
    if (onProgress && i % 10000 === 0) {
      onProgress(30 + Math.floor((i / (width * height)) * 30))
    }
  }
  
  return mask
}

/**
 * Apply edge feathering to alpha mask
 * @param {Uint8Array} mask - Alpha mask
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} radius - Feather radius (1-10)
 * @returns {Uint8Array} - Feathered alpha mask
 */
function applyEdgeFeather(mask, width, height, radius) {
  const feathered = new Uint8Array(mask)
  const r = Math.min(10, Math.max(1, Math.round(radius)))
  
  // Find edge pixels and apply blur
  for (let y = r; y < height - r; y++) {
    for (let x = r; x < width - r; x++) {
      const idx = y * width + x
      
      // Check if this is an edge pixel (opaque pixel adjacent to transparent)
      if (mask[idx] > 0) {
        let isEdge = false
        
        // Check immediate neighbors
        const neighbors = [
          (y - 1) * width + x,
          (y + 1) * width + x,
          y * width + (x - 1),
          y * width + (x + 1)
        ]
        
        for (const nIdx of neighbors) {
          if (mask[nIdx] === 0) {
            isEdge = true
            break
          }
        }
        
        if (isEdge) {
          // Apply Gaussian-like weighted average
          let sum = 0
          let weightSum = 0
          
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              const nIdx = (y + dy) * width + (x + dx)
              const dist = Math.sqrt(dx * dx + dy * dy)
              const weight = Math.exp(-(dist * dist) / (2 * r * r))
              
              sum += mask[nIdx] * weight
              weightSum += weight
            }
          }
          
          feathered[idx] = Math.round(sum / weightSum)
        }
      }
    }
  }
  
  return feathered
}

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color string
 * @returns {Object} - { r, g, b }
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 }
}

/**
 * Auto-detect background color from image corners
 * @param {File} imageSource - Image file
 * @returns {Promise<string>} - Detected background color (hex)
 */
export async function detectBackgroundColor(imageSource) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        
        // Sample colors from corners
        const samples = []
        const sampleSize = 5
        
        // Top-left corner
        const tlData = ctx.getImageData(0, 0, sampleSize, sampleSize).data
        samples.push(getAverageColor(tlData))
        
        // Top-right corner
        const trData = ctx.getImageData(img.width - sampleSize, 0, sampleSize, sampleSize).data
        samples.push(getAverageColor(trData))
        
        // Bottom-left corner
        const blData = ctx.getImageData(0, img.height - sampleSize, sampleSize, sampleSize).data
        samples.push(getAverageColor(blData))
        
        // Bottom-right corner
        const brData = ctx.getImageData(img.width - sampleSize, img.height - sampleSize, sampleSize, sampleSize).data
        samples.push(getAverageColor(brData))
        
        // Average all samples
        const avgR = Math.round(samples.reduce((sum, c) => sum + c.r, 0) / samples.length)
        const avgG = Math.round(samples.reduce((sum, c) => sum + c.g, 0) / samples.length)
        const avgB = Math.round(samples.reduce((sum, c) => sum + c.b, 0) / samples.length)
        
        const hex = rgbToHex(avgR, avgG, avgB)
        resolve(hex)
        
      } catch (error) {
        reject(error)
      }
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    
    if (imageSource instanceof File) {
      img.src = URL.createObjectURL(imageSource)
    } else {
      img.src = imageSource
    }
  })
}

/**
 * Get average color from image data
 * @param {Uint8ClampedArray} data - Image data
 * @returns {Object} - { r, g, b }
 */
function getAverageColor(data) {
  let r = 0, g = 0, b = 0
  const pixelCount = data.length / 4
  
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  
  return {
    r: Math.round(r / pixelCount),
    g: Math.round(g / pixelCount),
    b: Math.round(b / pixelCount)
  }
}

/**
 * Convert RGB to hex
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} - Hex color string
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

