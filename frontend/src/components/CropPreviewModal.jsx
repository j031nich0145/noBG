import React, { useState, useEffect, useRef } from 'react'
import './CropPreviewModal.css'

function CropPreviewModal({ originalFile, aspectRatio, onCrop, onCancel, onRotateImage }) {
  const [originalUrl, setOriginalUrl] = useState(null)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 })
  const [cropSize, setCropSize] = useState({ width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [currentAspectRatio, setCurrentAspectRatio] = useState(null)
  const [gridType, setGridType] = useState('off')
  const [cropColor, setCropColor] = useState('blue')
  const [imageRect, setImageRect] = useState({ width: 0, height: 0, left: 0, top: 0 })
  const imageRef = useRef(null)
  const containerRef = useRef(null)

  const aspectRatioOptions = [
    { value: '1:1', label: '1:1', ratio: 1 },
    { value: '3:2', label: '3:2', ratio: 3/2 },
    { value: '4:3', label: '4:3', ratio: 4/3 }
  ]

  const getAspectRatio = () => {
    if (aspectRatio === '1:1') return 1
    if (aspectRatio === '3:2') return 3 / 2
    if (aspectRatio === '4:3') return 4 / 3
    return 1
  }

  useEffect(() => {
    const updateImageRect = () => {
      if (imageRef.current && containerRef.current && imageDimensions.width) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const imageAspectRatio = imageDimensions.width / imageDimensions.height
        const containerAspectRatio = containerRect.width / containerRect.height
        
        let renderedWidth, renderedHeight, offsetX, offsetY
        
        if (imageAspectRatio > containerAspectRatio) {
          renderedWidth = containerRect.width
          renderedHeight = containerRect.width / imageAspectRatio
          offsetX = 0
          offsetY = (containerRect.height - renderedHeight) / 2
        } else {
          renderedHeight = containerRect.height
          renderedWidth = containerRect.height * imageAspectRatio
          offsetX = (containerRect.width - renderedWidth) / 2
          offsetY = 0
        }
        
        setImageRect({
          width: renderedWidth,
          height: renderedHeight,
          left: offsetX,
          top: offsetY
        })
      }
    }

    if (originalUrl && imageRef.current && imageDimensions.width) {
      const img = imageRef.current
      if (img.complete) {
        updateImageRect()
      } else {
        img.onload = updateImageRect
      }
      
      window.addEventListener('resize', updateImageRect)
      return () => window.removeEventListener('resize', updateImageRect)
    }
  }, [originalUrl, imageDimensions.width, imageDimensions.height])

  useEffect(() => {
    if (originalFile) {
      const url = URL.createObjectURL(originalFile)
      setOriginalUrl(url)

      const img = new Image()
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height })
      }
      img.src = url

      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, [originalFile, aspectRatio])

  useEffect(() => {
    if (!imageDimensions.width || !imageRect.width || cropSize.width > 0) return
    
    const targetRatio = getAspectRatio()
    const displayedImageRatio = imageRect.width / imageRect.height
    
    let cropBoxDisplayWidth, cropBoxDisplayHeight
    
    if (displayedImageRatio > targetRatio) {
      cropBoxDisplayHeight = imageRect.height
      cropBoxDisplayWidth = cropBoxDisplayHeight * targetRatio
    } else {
      cropBoxDisplayWidth = imageRect.width
      cropBoxDisplayHeight = cropBoxDisplayWidth / targetRatio
    }
    
    const scale = imageRect.width / imageDimensions.width
    const cropWidth = cropBoxDisplayWidth / scale
    const cropHeight = cropBoxDisplayHeight / scale
    
    const finalCropWidth = Math.min(cropWidth, imageDimensions.width)
    const finalCropHeight = Math.min(cropHeight, imageDimensions.height)
    
    const cropX = (imageDimensions.width - finalCropWidth) / 2
    const cropY = (imageDimensions.height - finalCropHeight) / 2
    
    setCropSize({ width: finalCropWidth, height: finalCropHeight })
    setCropPosition({ x: cropX, y: cropY })
    setCurrentAspectRatio(targetRatio)
  }, [imageDimensions, imageRect, aspectRatio, cropSize.width])

  const handleApplyCrop = () => {
    if (onCrop && originalFile) {
      onCrop(
        cropPosition.x,
        cropPosition.y,
        cropSize.width,
        cropSize.height
      )
    }
  }

  const handleRotateImage = async () => {
    if (onRotateImage) {
      await onRotateImage()
    }
  }

  const handleSwapAspectRatio = () => {
    if (!currentAspectRatio || currentAspectRatio === 1) return
    
    const newWidth = cropSize.height
    const newHeight = cropSize.width
    const newAspectRatio = 1 / currentAspectRatio
    setCurrentAspectRatio(newAspectRatio)
    
    let newX = cropPosition.x
    let newY = cropPosition.y
    
    if (newX + newWidth > imageDimensions.width || newY + newHeight > imageDimensions.height) {
      newX = Math.max(0, (imageDimensions.width - newWidth) / 2)
      newY = Math.max(0, (imageDimensions.height - newHeight) / 2)
    }
    
    setCropSize({ width: newWidth, height: newHeight })
    setCropPosition({ x: newX, y: newY })
  }

  const handleAspectRatioChange = (newRatioValue) => {
    const newRatio = aspectRatioOptions.find(opt => opt.value === newRatioValue).ratio
    setCurrentAspectRatio(newRatio)
    
    const currentArea = cropSize.width * cropSize.height
    let newWidth = Math.sqrt(currentArea * newRatio)
    let newHeight = newWidth / newRatio
    
    const maxWidthByImage = imageDimensions.width
    const maxHeightByImage = imageDimensions.height
    const maxWidthByRatio = maxHeightByImage * newRatio
    const maxHeightByRatio = maxWidthByImage / newRatio
    
    const absoluteMaxWidth = Math.min(maxWidthByImage, maxWidthByRatio)
    const absoluteMaxHeight = Math.min(maxHeightByImage, maxHeightByRatio)
    
    if (newWidth > absoluteMaxWidth) newWidth = absoluteMaxWidth
    if (newHeight > absoluteMaxHeight) newHeight = absoluteMaxHeight
    newWidth = Math.min(newWidth, newHeight * newRatio)
    newHeight = newWidth / newRatio
    
    if (newWidth < 20) newWidth = 20
    if (newHeight < 20) newHeight = 20
    newWidth = Math.max(20, newHeight * newRatio)
    newHeight = newWidth / newRatio
    
    let newX = cropPosition.x
    let newY = cropPosition.y
    
    if (newX + newWidth > imageDimensions.width) {
      newX = Math.max(0, (imageDimensions.width - newWidth) / 2)
    }
    if (newY + newHeight > imageDimensions.height) {
      newY = Math.max(0, (imageDimensions.height - newHeight) / 2)
    }
    
    setCropSize({ width: newWidth, height: newHeight })
    setCropPosition({ x: newX, y: newY })
  }

  const handleScale = (direction) => {
    if (!currentAspectRatio || !imageDimensions.width) return
    
    const scaleFactor = direction === 'up' ? 1.05 : 0.95
    let newWidth = cropSize.width * scaleFactor
    let newHeight = newWidth / currentAspectRatio
    
    if (newWidth < 20) newWidth = 20
    if (newHeight < 20) newHeight = 20
    newWidth = Math.max(20, newHeight * currentAspectRatio)
    newHeight = newWidth / currentAspectRatio
    
    const maxWidthByImage = imageDimensions.width
    const maxHeightByImage = imageDimensions.height
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
    
    if (newX + newWidth > imageDimensions.width) {
      newX = imageDimensions.width - newWidth
    }
    if (newY + newHeight > imageDimensions.height) {
      newY = imageDimensions.height - newHeight
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
        newY = Math.min(imageDimensions.height - cropSize.height, cropPosition.y + moveDistance)
        break
      case 'ArrowLeft':
        newX = Math.max(0, cropPosition.x - moveDistance)
        break
      case 'ArrowRight':
        newX = Math.min(imageDimensions.width - cropSize.width, cropPosition.x + moveDistance)
        break
    }
    
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
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        handleArrowMove(e.key)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [cropPosition, cropSize, originalFile, onCrop, onCancel, currentAspectRatio, imageDimensions])

  const handleMouseDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    const imgRect = imageRef.current?.getBoundingClientRect()
    if (imgRect) {
      const scale = getScale()
      const mouseX = (e.clientX - imgRect.left - imageRect.left) / scale
      const mouseY = (e.clientY - imgRect.top - imageRect.top) / scale
      
      setDragStart({ x: mouseX, y: mouseY })
      setDragOffset({
        x: mouseX - cropPosition.x,
        y: mouseY - cropPosition.y
      })
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      if (!imageRef.current || !imageDimensions.width) return
      e.stopPropagation()

      const imgRect = imageRef.current.getBoundingClientRect()
      const scale = getScale()
      
      const mouseX = (e.clientX - imgRect.left - imageRect.left) / scale
      const mouseY = (e.clientY - imgRect.top - imageRect.top) / scale
      
      const newX = mouseX - dragOffset.x
      const newY = mouseY - dragOffset.y

      const constrainedX = Math.max(0, Math.min(newX, imageDimensions.width - cropSize.width))
      const constrainedY = Math.max(0, Math.min(newY, imageDimensions.height - cropSize.height))

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
  }, [isDragging, dragOffset, imageDimensions, cropSize])

  const getScale = () => {
    if (!imageDimensions.width || imageRect.width === 0) return 1
    return imageRect.width / imageDimensions.width
  }

  const colors = {
    blue: '#4dd0e1',
    black: '#000000',
    white: '#ffffff'
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

  if (!originalUrl) return null

  const scale = getScale()
  const displayX = cropPosition.x * scale
  const displayY = cropPosition.y * scale
  const displayWidth = cropSize.width * scale
  const displayHeight = cropSize.height * scale

  return (
    <div className="crop-modal-overlay">
      <div className="crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crop-controls-bar">
          <div className="crop-control-group">
            <span className="crop-control-label">Ratio:</span>
            {aspectRatioOptions.map(option => (
              <button
                key={option.value}
                className={`crop-control-button ${currentAspectRatio === option.ratio ? 'active' : ''}`}
                onClick={() => handleAspectRatioChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="crop-control-group">
            <span className="crop-control-label">Grid:</span>
            <button
              className={`crop-control-button ${gridType === '3x3' ? 'active' : ''}`}
              onClick={() => setGridType('3x3')}
            >
              3×3
            </button>
            <button
              className={`crop-control-button ${gridType === '9x9' ? 'active' : ''}`}
              onClick={() => setGridType('9x9')}
            >
              9×9
            </button>
            <button
              className={`crop-control-button ${gridType === 'off' ? 'active' : ''}`}
              onClick={() => setGridType('off')}
            >
              Off
            </button>
          </div>
          <div className="crop-control-group">
            <span className="crop-control-label">Color:</span>
            <button
              className={`crop-control-button crop-color-button ${cropColor === 'blue' ? 'active' : ''}`}
              onClick={() => setCropColor('blue')}
              style={{ backgroundColor: cropColor === 'blue' ? colors.blue : 'transparent' }}
            >
              Blue
            </button>
            <button
              className={`crop-control-button crop-color-button ${cropColor === 'black' ? 'active' : ''}`}
              onClick={() => setCropColor('black')}
              style={{ backgroundColor: cropColor === 'black' ? colors.black : 'transparent' }}
            >
              Black
            </button>
            <button
              className={`crop-control-button crop-color-button ${cropColor === 'white' ? 'active' : ''}`}
              onClick={() => setCropColor('white')}
              style={{ 
                backgroundColor: cropColor === 'white' ? colors.white : 'transparent',
                color: cropColor === 'white' ? '#000' : '#00838f'
              }}
            >
              White
            </button>
          </div>
        </div>

        <div className="crop-preview-container" ref={containerRef}>
          <div className="crop-image-wrapper">
            <img
              ref={imageRef}
              src={originalUrl}
              alt="Crop preview"
              className="crop-preview-image"
            />
            <div 
              className="crop-mask"
              style={{
                width: imageRect.width > 0 ? `${imageRect.width}px` : '0px',
                height: imageRect.height > 0 ? `${imageRect.height}px` : '0px',
                left: imageRect.width > 0 ? `${imageRect.left}px` : '0px',
                top: imageRect.height > 0 ? `${imageRect.top}px` : '0px',
              }}
            >
              <div
                className="crop-overlay"
                style={{
                  left: `${displayX}px`,
                  top: `${displayY}px`,
                  width: `${displayWidth}px`,
                  height: `${displayHeight}px`,
                  borderColor: colors[cropColor],
                }}
                onMouseDown={handleMouseDown}
              >
                {renderGridLines()}
                <div className="crop-handle crop-handle-center" style={{ backgroundColor: colors[cropColor] }} />
              </div>
            </div>
          </div>
        </div>
        <div className="crop-instructions">
          Drag to move • Arrow keys to nudge • +/- to resize
        </div>
        <div className="crop-actions">
          <button className="crop-rotate-button" onClick={handleRotateImage} title="Rotate image 90° clockwise">
            ↻ Rotate Image
          </button>
          <button 
            className="crop-rotate-button" 
            onClick={handleSwapAspectRatio} 
            disabled={currentAspectRatio === 1}
            title="Rotate crop box (landscape ↔ portrait)"
          >
            ↻ Rotate Crop
          </button>
          <button className="crop-cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="crop-apply-button" onClick={handleApplyCrop}>
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  )
}

export default CropPreviewModal

