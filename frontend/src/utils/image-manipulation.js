/**
 * Image manipulation utilities for cropping and edge refinement
 */

/**
 * Crop an image to a specific aspect ratio (centered crop) or with custom coordinates
 * @param {File} file - Image file to crop
 * @param {string} aspectRatio - Aspect ratio: '1:1', '3:2', or '4:3'
 * @param {number} [cropX] - Optional X coordinate for crop (in pixels, relative to original image)
 * @param {number} [cropY] - Optional Y coordinate for crop (in pixels, relative to original image)
 * @param {number} [cropWidth] - Optional width for crop (in pixels)
 * @param {number} [cropHeight] - Optional height for crop (in pixels)
 * @returns {Promise<File>} - Cropped image as File
 */
export async function cropImage(file, aspectRatio, cropX = null, cropY = null, cropWidth = null, cropHeight = null) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      try {
        const width = img.width
        const height = img.height
        
        let finalCropX, finalCropY, finalCropWidth, finalCropHeight
        
        // If custom coordinates provided, use them
        if (cropX !== null && cropY !== null && cropWidth !== null && cropHeight !== null) {
          finalCropX = cropX
          finalCropY = cropY
          finalCropWidth = cropWidth
          finalCropHeight = cropHeight
        } else {
          // Otherwise, calculate centered crop based on aspect ratio
          // Calculate target aspect ratio
          let targetRatio
          if (aspectRatio === '1:1') {
            targetRatio = 1
          } else if (aspectRatio === '3:2') {
            targetRatio = 3 / 2
          } else if (aspectRatio === '4:3') {
            targetRatio = 4 / 3
          } else {
            reject(new Error('Invalid aspect ratio'))
            return
          }
          
          // Calculate current aspect ratio
          const currentRatio = width / height
          
          // Calculate crop dimensions (centered)
          if (currentRatio > targetRatio) {
            // Image is wider than target - crop width (keep full height)
            finalCropHeight = height
            finalCropWidth = height * targetRatio
            finalCropX = (width - finalCropWidth) / 2
            finalCropY = 0
          } else {
            // Image is taller than target - crop height (keep full width)
            finalCropWidth = width
            finalCropHeight = width / targetRatio
            finalCropX = 0
            finalCropY = (height - finalCropHeight) / 2
          }
        }
        
        // Create canvas for cropping
        const canvas = document.createElement('canvas')
        canvas.width = finalCropWidth
        canvas.height = finalCropHeight
        const ctx = canvas.getContext('2d')
        
        // Draw cropped portion
        ctx.drawImage(
          img,
          finalCropX, finalCropY, finalCropWidth, finalCropHeight,  // Source crop
          0, 0, finalCropWidth, finalCropHeight           // Destination
        )
        
        // Convert to blob then to file
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create cropped image'))
            return
          }
          
          // Create new File from blob
          const croppedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          })
          
          URL.revokeObjectURL(url)
          resolve(croppedFile)
        }, file.type || 'image/png')
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    
    img.src = url
  })
}

/**
 * Rotate an image 90 degrees clockwise
 * @param {File} file - Image file to rotate
 * @returns {Promise<File>} - Rotated image as File
 */
export async function rotateImage90CW(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        // Swap dimensions for 90° rotation
        canvas.width = img.height
        canvas.height = img.width
        const ctx = canvas.getContext('2d')
        
        // Rotate 90° clockwise
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(Math.PI / 2)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to rotate image'))
            return
          }
          
          const rotatedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          })
          
          URL.revokeObjectURL(url)
          resolve(rotatedFile)
        }, file.type || 'image/png')
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    
    img.src = url
  })
}

/**
 * Apply edge refinement (Gaussian blur on edges)
 * Reduces jagged edges on background-removed images
 * @param {File} file - Image file to refine
 * @param {number} radius - Blur radius (1-5)
 * @returns {Promise<File>} - Refined image as File
 */
export async function refineEdges(file, radius = 2) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      try {
        const width = img.width
        const height = img.height
        
        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        
        // Draw original image
        ctx.drawImage(img, 0, 0)
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data
        
        // Find edge pixels (pixels adjacent to transparent pixels)
        const edgeMask = new Uint8Array(width * height)
        
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4
            const alpha = data[idx + 3]
            
            if (alpha > 0) {
              // Check if any neighbor is transparent
              const neighbors = [
                (y - 1) * width + x,     // top
                (y + 1) * width + x,     // bottom
                y * width + (x - 1),     // left
                y * width + (x + 1),     // right
              ]
              
              for (const nIdx of neighbors) {
                if (data[nIdx * 4 + 3] === 0) {
                  edgeMask[y * width + x] = 1
                  break
                }
              }
            }
          }
        }
        
        // Apply slight blur to edge pixels
        const blurRadius = Math.min(5, Math.max(1, radius))
        const tempData = new Uint8ClampedArray(data)
        
        for (let y = blurRadius; y < height - blurRadius; y++) {
          for (let x = blurRadius; x < width - blurRadius; x++) {
            if (edgeMask[y * width + x]) {
              let r = 0, g = 0, b = 0, a = 0, count = 0
              
              for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                  const nIdx = ((y + dy) * width + (x + dx)) * 4
                  if (tempData[nIdx + 3] > 0) {
                    r += tempData[nIdx]
                    g += tempData[nIdx + 1]
                    b += tempData[nIdx + 2]
                    a += tempData[nIdx + 3]
                    count++
                  }
                }
              }
              
              if (count > 0) {
                const idx = (y * width + x) * 4
                data[idx] = Math.round(r / count)
                data[idx + 1] = Math.round(g / count)
                data[idx + 2] = Math.round(b / count)
                data[idx + 3] = Math.round(a / count)
              }
            }
          }
        }
        
        ctx.putImageData(imageData, 0, 0)
        
        // Convert to blob then to file
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create refined image'))
            return
          }
          
          const refinedFile = new File([blob], file.name, {
            type: 'image/png',
            lastModified: Date.now()
          })
          
          URL.revokeObjectURL(url)
          resolve(refinedFile)
        }, 'image/png')
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    
    img.src = url
  })
}

/**
 * Apply the same crop to multiple images
 * Crop coordinates are based on a reference image and scaled proportionally to each image
 * @param {Array<File>} files - Array of image files to crop
 * @param {Object} cropData - Crop data from BatchCropModal
 * @param {number} cropData.x - X position in pixels (based on reference image)
 * @param {number} cropData.y - Y position in pixels (based on reference image)
 * @param {number} cropData.width - Crop width in pixels (based on reference image)
 * @param {number} cropData.height - Crop height in pixels (based on reference image)
 * @param {Object} cropData.referenceDimensions - Dimensions of reference image
 * @param {Array<number>} cropData.includedImages - Indices of images to crop
 * @returns {Promise<Array<File>>} - Array of cropped image files
 */
export async function batchCropImages(files, cropData) {
  const { x, y, width, height, referenceDimensions, scalingInfo, includedImages } = cropData
  
  // Output dimensions are always the same (from the crop box)
  const outputWidth = Math.round(width)
  const outputHeight = Math.round(height)
  
  const croppedFiles = []
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    // Skip if not included in crop
    if (!includedImages.includes(i)) {
      croppedFiles.push(file)
      continue
    }
    
    try {
      // Load image to get dimensions
      const img = await loadImageFromFile(file)
      
      // Calculate scale factor for this image (scaled so height matches reference height)
      const heightScale = img.height / referenceDimensions.height
      
      // Convert crop coordinates from reference space to this image's native pixels
      const nativeCropX = Math.round(x * heightScale)
      const nativeCropY = Math.round(y * heightScale)
      const nativeCropWidth = Math.round(width * heightScale)
      const nativeCropHeight = Math.round(height * heightScale)
      
      // Ensure crop stays within bounds
      const finalX = Math.max(0, Math.min(nativeCropX, img.width - nativeCropWidth))
      const finalY = Math.max(0, Math.min(nativeCropY, img.height - nativeCropHeight))
      
      // Crop and resize to uniform output dimensions
      const croppedFile = await cropAndResizeImage(
        file, finalX, finalY, nativeCropWidth, nativeCropHeight, outputWidth, outputHeight
      )
      
      croppedFiles.push(croppedFile)
    } catch (error) {
      console.error(`Failed to crop image ${file.name}:`, error)
      // Keep original file if crop fails
      croppedFiles.push(file)
    }
  }
  
  return croppedFiles
}

/**
 * Helper to load image from file
 * @param {File} file - Image file to load
 * @returns {Promise<HTMLImageElement>} - Loaded image element
 */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

/**
 * Crop image and resize to uniform output dimensions
 * @param {File} file - Image file to crop
 * @param {number} x - X coordinate in pixels
 * @param {number} y - Y coordinate in pixels
 * @param {number} cropWidth - Crop width in pixels (source region)
 * @param {number} cropHeight - Crop height in pixels (source region)
 * @param {number} outputWidth - Output width in pixels
 * @param {number} outputHeight - Output height in pixels
 * @returns {Promise<File>} - Cropped and resized image as File
 */
function cropAndResizeImage(file, x, y, cropWidth, cropHeight, outputWidth, outputHeight) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      try {
        // Create canvas at output dimensions
        const canvas = document.createElement('canvas')
        canvas.width = outputWidth
        canvas.height = outputHeight
        const ctx = canvas.getContext('2d')
        
        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // Draw cropped portion scaled to output size
        ctx.drawImage(
          img,
          x, y, cropWidth, cropHeight,    // Source crop region
          0, 0, outputWidth, outputHeight  // Destination (scaled to output)
        )
        
        // Convert to blob then to file
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create cropped image'))
            return
          }
          
          // Create new File from blob
          const croppedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          })
          
          URL.revokeObjectURL(url)
          resolve(croppedFile)
        }, file.type || 'image/png')
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    
    img.src = url
  })
}

