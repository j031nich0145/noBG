import { useState, useEffect, useRef } from 'react'
import './BatchCropModal.css'

function BatchCropModal({ files, targetImageFile, onApply, onCancel }) {
  // Image state
  const [images, setImages] = useState([])
  const [stackOrder, setStackOrder] = useState([])
  
  // Crop state
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 })
  const [cropSize, setCropSize] = useState({ width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  // UI state
  const [currentAspectRatio, setCurrentAspectRatio] = useState(1)
  const [gridType, setGridType] = useState('off')
  const [cropColor, setCropColor] = useState('blue')
  const [imageAlignment, setImageAlignment] = useState('left')
  const [cropRotated, setCropRotated] = useState(false)
  
  // Reference dimensions
  const [referenceDimensions, setReferenceDimensions] = useState({ width: 0, height: 0 })
  const [imageRect, setImageRect] = useState({ width: 0, height: 0, left: 0, top: 0 })
  const [scalingInfo, setScalingInfo] = useState({
    referenceIndex: 0,
    referenceDims: { width: 0, height: 0 },
    baseDisplayScale: 1
  })
  const [boundsRect, setBoundsRect] = useState({ width: 0, height: 0, left: 0, top: 0 })
  
  const containerRef = useRef(null)
  const stackRef = useRef(null)

  const aspectRatioOptions = [
    { value: '1:1', label: '1:1', ratio: 1 },
    { value: '3:2', label: '3:2', ratio: 3/2 },
    { value: '4:3', label: '4:3', ratio: 4/3 }
  ]

  const colors = {
    blue: '#4dd0e1',
    black: '#000000',
    white: '#ffffff'
  }

  // Initialize images from files
  useEffect(() => {
    const loadImages = async () => {
      const imagePromises = files.map((file, index) => {
        const isTarget = targetImageFile && index === 0
        return new Promise((resolve) => {
          const url = URL.createObjectURL(file)
          const img = new Image()
          img.onload = () => {
            resolve({
              file,
              url,
              included: true,
              dimensions: { width: img.width, height: img.height },
              index,
              isTargetImage: isTarget
            })
          }
          img.onerror = () => {
            resolve({
              file,
              url,
              included: false,
              dimensions: { width: 0, height: 0 },
              index,
              isTargetImage: isTarget
            })
          }
          img.src = url
        })
      })

      const loadedImages = await Promise.all(imagePromises)
      setImages(loadedImages)
      
      if (loadedImages.length > 0) {
        const validImages = loadedImages.filter(img => img.dimensions.width > 0)
        
        let referenceIndex = 0
        let smallestWidth = Infinity
        
        validImages.forEach((img) => {
          if (img.dimensions.width < smallestWidth) {
            smallestWidth = img.dimensions.width
            referenceIndex = img.index
          }
        })
        
        const referenceImage = loadedImages[referenceIndex]
        const referenceDims = referenceImage.dimensions
        
        setScalingInfo({
          referenceIndex,
          referenceDims,
          baseDisplayScale: 1
        })
        
        const newStackOrder = [referenceIndex]
        for (let i = 0; i < loadedImages.length; i++) {
          if (i !== referenceIndex) {
            newStackOrder.push(i)
          }
        }
        
        setStackOrder(newStackOrder)
        
        if (referenceDims.width > 0) {
          setReferenceDimensions(referenceDims)
        }
      }
    }

    if (files.length > 0) {
      loadImages()
    }

    return () => {
      images.forEach(img => URL.revokeObjectURL(img.url))
    }
  }, [files])

  // Update bounds rect
  useEffect(() => {
    const updateBoundsRect = () => {
      if (containerRef.current && scalingInfo.referenceDims.width > 0) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const { referenceDims } = scalingInfo
        
        const refAspect = referenceDims.width / referenceDims.height
        const containerAspect = containerRect.width / containerRect.height
        
        let baseDisplayScale
        if (refAspect > containerAspect) {
          baseDisplayScale = containerRect.width / referenceDims.width
        } else {
          baseDisplayScale = containerRect.height / referenceDims.height
        }
        
        setScalingInfo(prev => ({ ...prev, baseDisplayScale }))
        
        const boundsWidth = referenceDims.width * baseDisplayScale
        const boundsHeight = referenceDims.height * baseDisplayScale
        const boundsLeft = (containerRect.width - boundsWidth) / 2
        const boundsTop = (containerRect.height - boundsHeight) / 2
        
        setBoundsRect({
          width: boundsWidth,
          height: boundsHeight,
          left: boundsLeft,
          top: boundsTop
        })
        
        setImageRect({
          width: boundsWidth,
          height: boundsHeight,
          left: boundsLeft,
          top: boundsTop
        })
      }
    }

    updateBoundsRect()
    window.addEventListener('resize', updateBoundsRect)
    return () => window.removeEventListener('resize', updateBoundsRect)
  }, [scalingInfo.referenceDims, images])

  // Initialize crop box
  useEffect(() => {
    if (!referenceDimensions.width || !imageRect.width || cropSize.width > 0) return
    
    const targetRatio = currentAspectRatio
    const imageRatio = referenceDimensions.width / referenceDimensions.height
    
    let cropWidth, cropHeight
    
    if (imageRatio > targetRatio) {
      cropHeight = referenceDimensions.height
      cropWidth = cropHeight * targetRatio
    } else {
      cropWidth = referenceDimensions.width
      cropHeight = cropWidth / targetRatio
    }
    
    const finalCropWidth = Math.min(cropWidth, referenceDimensions.width)
    const finalCropHeight = Math.min(cropHeight, referenceDimensions.height)
    
    const cropX = (referenceDimensions.width - finalCropWidth) / 2
    const cropY = (referenceDimensions.height - finalCropHeight) / 2
    
    setCropSize({ width: finalCropWidth, height: finalCropHeight })
    setCropPosition({ x: cropX, y: cropY })
  }, [referenceDimensions, imageRect, currentAspectRatio, cropSize.width])

  const calculateOpacity = (stackIndex) => {
    if (stackIndex === 0) return 0.4
    return 0.3
  }

  const moveTopToBottom = () => {
    setStackOrder(prevOrder => {
      const newOrder = [...prevOrder]
      const topImage = newOrder.shift()
      newOrder.push(topImage)
      return newOrder
    })
  }

  const toggleImageInclusion = (imageIndex) => {
    setImages(prevImages => {
      const newImages = [...prevImages]
      newImages[imageIndex].included = !newImages[imageIndex].included
      return newImages
    })
  }

  const getScale = () => {
    if (!referenceDimensions.width || boundsRect.width === 0) return 1
    return boundsRect.width / referenceDimensions.width
  }

  const getImageDisplaySize = (imageDimensions, imageIndex) => {
    if (!containerRef.current || !imageDimensions.width || !boundsRect.height) {
      return { width: 0, height: 0 }
    }
    
    const targetHeight = boundsRect.height
    const scale = targetHeight / imageDimensions.height
    
    return {
      width: imageDimensions.width * scale,
      height: targetHeight
    }
  }

  const getImagePosition = (imageDimensions, imageIndex) => {
    if (!containerRef.current || !boundsRect.width) {
      return { left: 0, top: 0 }
    }
    const displaySize = getImageDisplaySize(imageDimensions, imageIndex)
    
    let left
    switch (imageAlignment) {
      case 'center':
        left = boundsRect.left + (boundsRect.width - displaySize.width) / 2
        break
      case 'right':
        left = boundsRect.left + boundsRect.width - displaySize.width
        break
      case 'left':
      default:
        left = boundsRect.left
        break
    }
    
    return {
      left,
      top: boundsRect.top
    }
  }

  const handleMouseDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    
    const scale = getScale()
    const rect = stackRef.current?.getBoundingClientRect()
    if (rect) {
      const mouseX = (e.clientX - rect.left - boundsRect.left) / scale
      const mouseY = (e.clientY - rect.top - boundsRect.top) / scale
      
      setDragOffset({
        x: mouseX - cropPosition.x,
        y: mouseY - cropPosition.y
      })
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      if (!stackRef.current || !referenceDimensions.width) return

      e.stopPropagation()

      const rect = stackRef.current.getBoundingClientRect()
      const scale = getScale()
      
      const mouseX = (e.clientX - rect.left - boundsRect.left) / scale
      const mouseY = (e.clientY - rect.top - boundsRect.top) / scale
      
      const newX = mouseX - dragOffset.x
      const newY = mouseY - dragOffset.y

      const constrainedX = Math.max(0, Math.min(newX, referenceDimensions.width - cropSize.width))
      const constrainedY = Math.max(0, Math.min(newY, referenceDimensions.height - cropSize.height))

      setCropPosition({ x: constrainedX, y: constrainedY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset, referenceDimensions, cropSize, boundsRect])

  const handleAspectRatioChange = (newRatioValue) => {
    const newRatio = aspectRatioOptions.find(opt => opt.value === newRatioValue).ratio
    setCurrentAspectRatio(newRatio)
    
    const currentArea = cropSize.width * cropSize.height
    let newWidth = Math.sqrt(currentArea * newRatio)
    let newHeight = newWidth / newRatio
    
    const maxWidthByImage = referenceDimensions.width
    const maxHeightByImage = referenceDimensions.height
    const maxWidthByRatio = maxHeightByImage * newRatio
    const maxHeightByRatio = maxWidthByImage / newRatio
    
    const absoluteMaxWidth = Math.min(maxWidthByImage, maxWidthByRatio)
    const absoluteMaxHeight = Math.min(maxHeightByImage, maxHeightByRatio)
    
    if (newWidth > absoluteMaxWidth) newWidth = absoluteMaxWidth
    if (newHeight > absoluteMaxHeight) newHeight = absoluteMaxHeight
    newWidth = Math.min(newWidth, newHeight * newRatio)
    newHeight = newWidth / newRatio
    
    let newX = cropPosition.x
    let newY = cropPosition.y
    
    if (newX + newWidth > referenceDimensions.width) {
      newX = Math.max(0, (referenceDimensions.width - newWidth) / 2)
    }
    if (newY + newHeight > referenceDimensions.height) {
      newY = Math.max(0, (referenceDimensions.height - newHeight) / 2)
    }
    
    setCropSize({ width: newWidth, height: newHeight })
    setCropPosition({ x: newX, y: newY })
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleApplyCrop()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        handleScale('up')
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        handleScale('down')
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        handleArrowMove(e.key)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cropPosition, cropSize, referenceDimensions, currentAspectRatio])

  const handleScale = (direction) => {
    if (!currentAspectRatio || !referenceDimensions.width) return
    
    const scaleFactor = direction === 'up' ? 1.05 : 0.95
    let newWidth = cropSize.width * scaleFactor
    let newHeight = newWidth / currentAspectRatio
    
    if (newWidth < 20) newWidth = 20
    if (newHeight < 20) newHeight = 20
    newWidth = Math.max(20, newHeight * currentAspectRatio)
    newHeight = newWidth / currentAspectRatio
    
    const maxWidthByImage = referenceDimensions.width
    const maxHeightByImage = referenceDimensions.height
    const maxWidthByRatio = maxHeightByImage * currentAspectRatio
    const maxHeightByRatio = maxWidthByImage / currentAspectRatio
    
    const absoluteMaxWidth = Math.min(maxWidthByImage, maxWidthByRatio)
    const absoluteMaxHeight = Math.min(maxHeightByImage, maxHeightByRatio)
    
    if (newWidth > absoluteMaxWidth) newWidth = absoluteMaxWidth
    if (newHeight > absoluteMaxHeight) newHeight = absoluteMaxHeight
    newWidth = Math.min(newWidth, newHeight * currentAspectRatio)
    newHeight = newWidth / currentAspectRatio
    
    let newX = cropPosition.x
    let newY = cropPosition.y
    
    if (newX + newWidth > referenceDimensions.width) {
      newX = referenceDimensions.width - newWidth
    }
    if (newY + newHeight > referenceDimensions.height) {
      newY = referenceDimensions.height - newHeight
    }
    
    newX = Math.max(0, newX)
    newY = Math.max(0, newY)
    
    setCropSize({ width: newWidth, height: newHeight })
    setCropPosition({ x: newX, y: newY })
  }

  const handleArrowMove = (key) => {
    const moveDistance = 10
    let newX = cropPosition.x
    let newY = cropPosition.y
    
    switch(key) {
      case 'ArrowUp':
        newY = Math.max(0, cropPosition.y - moveDistance)
        break
      case 'ArrowDown':
        newY = Math.min(referenceDimensions.height - cropSize.height, cropPosition.y + moveDistance)
        break
      case 'ArrowLeft':
        newX = Math.max(0, cropPosition.x - moveDistance)
        break
      case 'ArrowRight':
        newX = Math.min(referenceDimensions.width - cropSize.width, cropPosition.x + moveDistance)
        break
    }
    
    setCropPosition({ x: newX, y: newY })
  }

  const handleRotateCrop = () => {
    if (!referenceDimensions.width || cropSize.width === 0) return
    
    const newWidth = cropSize.height
    const newHeight = cropSize.width
    const newRatio = newWidth / newHeight
    setCurrentAspectRatio(newRatio)
    
    const maxWidth = referenceDimensions.width
    const maxHeight = referenceDimensions.height
    
    let finalWidth = Math.min(newWidth, maxWidth)
    let finalHeight = Math.min(newHeight, maxHeight)
    
    if (finalWidth / finalHeight > newRatio) {
      finalWidth = finalHeight * newRatio
    } else {
      finalHeight = finalWidth / newRatio
    }
    
    let newX = cropPosition.x
    let newY = cropPosition.y
    
    if (newX + finalWidth > referenceDimensions.width) {
      newX = Math.max(0, referenceDimensions.width - finalWidth)
    }
    if (newY + finalHeight > referenceDimensions.height) {
      newY = Math.max(0, referenceDimensions.height - finalHeight)
    }
    
    setCropSize({ width: finalWidth, height: finalHeight })
    setCropPosition({ x: newX, y: newY })
    setCropRotated(!cropRotated)
  }

  const renderGridLines = () => {
    if (gridType === 'off') return null

    const gridDivisions = gridType === '3x3' ? 3 : 9
    const lines = []

    for (let i = 1; i < gridDivisions; i++) {
      const xPercent = (i / gridDivisions) * 100
      const isMainLine = gridType === '9x9' && i % 3 === 0
      lines.push(
        <div
          key={`v-${i}`}
          className={`crop-grid-line crop-grid-line-vertical ${isMainLine ? 'crop-grid-line-main' : ''}`}
          style={{ left: `${xPercent}%`, backgroundColor: colors[cropColor] }}
        />
      )
    }

    for (let i = 1; i < gridDivisions; i++) {
      const yPercent = (i / gridDivisions) * 100
      const isMainLine = gridType === '9x9' && i % 3 === 0
      lines.push(
        <div
          key={`h-${i}`}
          className={`crop-grid-line crop-grid-line-horizontal ${isMainLine ? 'crop-grid-line-main' : ''}`}
          style={{ top: `${yPercent}%`, backgroundColor: colors[cropColor] }}
        />
      )
    }

    return <>{lines}</>
  }

  const handleApplyCrop = () => {
    if (!onApply) return
    
    const cropData = {
      x: cropPosition.x,
      y: cropPosition.y,
      width: cropSize.width,
      height: cropSize.height,
      referenceDimensions,
      scalingInfo,
      includedImages: images.filter(img => img.included).map(img => img.index)
    }
    
    onApply(cropData)
  }

  const includedCount = images.filter(img => img.included).length

  const scale = getScale()
  const displayX = cropPosition.x * scale
  const displayY = cropPosition.y * scale
  const displayWidth = cropSize.width * scale
  const displayHeight = cropSize.height * scale

  return (
    <div className="batch-crop-modal-overlay">
      <div className="batch-crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="batch-crop-controls-bar">
          <div className="batch-crop-control-group">
            <button className="batch-crop-move-button" onClick={moveTopToBottom} title="Move top image to bottom">
              ↻ Move Top to Bottom
            </button>
          </div>
          
          <div className="batch-crop-control-group">
            <button className="batch-crop-move-button" onClick={handleRotateCrop} title="Rotate crop box 90 degrees">
              ⟲ Rotate
            </button>
          </div>
          
          <div className="batch-crop-control-group">
            <span className="batch-crop-control-label">Ratio:</span>
            {aspectRatioOptions.map(option => (
              <button
                key={option.value}
                className={`batch-crop-control-button ${currentAspectRatio === option.ratio ? 'active' : ''}`}
                onClick={() => handleAspectRatioChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          <div className="batch-crop-control-group">
            <span className="batch-crop-control-label">Grid:</span>
            <button className={`batch-crop-control-button ${gridType === '3x3' ? 'active' : ''}`} onClick={() => setGridType('3x3')}>3×3</button>
            <button className={`batch-crop-control-button ${gridType === '9x9' ? 'active' : ''}`} onClick={() => setGridType('9x9')}>9×9</button>
            <button className={`batch-crop-control-button ${gridType === 'off' ? 'active' : ''}`} onClick={() => setGridType('off')}>Off</button>
          </div>
          
          <div className="batch-crop-control-group">
            <span className="batch-crop-control-label">Color:</span>
            <button
              className={`batch-crop-control-button batch-crop-color-button ${cropColor === 'blue' ? 'active' : ''}`}
              onClick={() => setCropColor('blue')}
              style={{ backgroundColor: cropColor === 'blue' ? colors.blue : 'transparent' }}
            >Blue</button>
            <button
              className={`batch-crop-control-button batch-crop-color-button ${cropColor === 'black' ? 'active' : ''}`}
              onClick={() => setCropColor('black')}
              style={{ backgroundColor: cropColor === 'black' ? colors.black : 'transparent' }}
            >Black</button>
            <button
              className={`batch-crop-control-button batch-crop-color-button ${cropColor === 'white' ? 'active' : ''}`}
              onClick={() => setCropColor('white')}
              style={{ backgroundColor: cropColor === 'white' ? colors.white : 'transparent', color: cropColor === 'white' ? '#000' : '#00838f' }}
            >White</button>
          </div>
        </div>

        <div className="batch-crop-content-area">
          <div className="batch-crop-image-list-sidebar">
            <div className="batch-crop-image-list-title">Images ({includedCount} selected)</div>
            <div className="batch-crop-image-list-items">
              {stackOrder.map((imageIndex, stackIndex) => {
                const image = images[imageIndex]
                if (!image) return null
                
                return (
                  <div 
                    key={`checkbox-${imageIndex}`} 
                    className={`batch-crop-image-item ${image.included ? 'included' : ''}`}
                    onClick={() => toggleImageInclusion(imageIndex)}
                  >
                    <span className="batch-crop-image-check">{image.included ? '✓' : '○'}</span>
                    <span className="batch-crop-image-name">{image.file.name} {stackIndex === 0 ? '(top)' : ''}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="batch-crop-preview-container" ref={containerRef}>
            <div className="batch-crop-stack-wrapper" ref={stackRef}>
              {stackOrder.map((imageIndex, stackIndex) => {
                const image = images[imageIndex]
                if (!image || !image.included) return null
                
                const opacity = calculateOpacity(stackIndex)
                const displaySize = getImageDisplaySize(image.dimensions, imageIndex)
                const imagePosition = getImagePosition(image.dimensions, imageIndex)
                
                return (
                  <div key={`stack-${imageIndex}`} className="batch-crop-stack-layer" style={{ opacity, zIndex: stackOrder.length - stackIndex }}>
                    <img
                      src={image.url}
                      alt={image.file.name}
                      className="batch-crop-stack-image"
                      style={{
                        width: displaySize.width > 0 ? `${displaySize.width}px` : 'auto',
                        height: displaySize.height > 0 ? `${displaySize.height}px` : 'auto',
                        left: `${imagePosition.left}px`,
                        top: `${imagePosition.top}px`,
                      }}
                    />
                  </div>
                )
              })}
              
              {boundsRect.width > 0 && (
                <div className="batch-crop-bounds-box" style={{ width: `${boundsRect.width}px`, height: `${boundsRect.height}px`, left: `${boundsRect.left}px`, top: `${boundsRect.top}px` }} />
              )}

              {boundsRect.width > 0 && (
                <div className="batch-crop-mask" style={{ width: `${boundsRect.width}px`, height: `${boundsRect.height}px`, left: `${boundsRect.left}px`, top: `${boundsRect.top}px` }}>
                  <div
                    className="batch-crop-overlay"
                    style={{ left: `${displayX}px`, top: `${displayY}px`, width: `${displayWidth}px`, height: `${displayHeight}px`, borderColor: colors[cropColor] }}
                    onMouseDown={handleMouseDown}
                  >
                    {renderGridLines()}
                    <div className="batch-crop-handle" style={{ backgroundColor: colors[cropColor] }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="batch-crop-instructions">Drag to move • Arrow keys to nudge • +/- to resize</div>

        <div className="batch-crop-actions">
          <div className="batch-crop-alignment-controls">
            <span className="batch-crop-control-label">Alignment:</span>
            <button className={`batch-crop-control-button ${imageAlignment === 'left' ? 'active' : ''}`} onClick={() => setImageAlignment('left')}>Left</button>
            <button className={`batch-crop-control-button ${imageAlignment === 'center' ? 'active' : ''}`} onClick={() => setImageAlignment('center')}>Center</button>
            <button className={`batch-crop-control-button ${imageAlignment === 'right' ? 'active' : ''}`} onClick={() => setImageAlignment('right')}>Right</button>
          </div>
          
          <div className="batch-crop-action-buttons">
            <button className="batch-crop-cancel-button" onClick={onCancel}>Cancel</button>
            <button className="batch-crop-apply-button" onClick={handleApplyCrop} disabled={includedCount === 0}>
              Apply Crop to {includedCount} image{includedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BatchCropModal

