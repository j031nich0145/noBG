import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import CropPreviewModal from './CropPreviewModal'
import './RemovalControls.css'

function RemovalControls({
  liveUpdate,
  onLiveUpdateChange,
  threshold,
  onThresholdChange,
  method,
  onMethodChange,
  edgeFeather,
  onEdgeFeatherChange,
  backgroundColor,
  onBackgroundColorChange,
  imageDimensions,
  onDownload,
  onProcess,
  processedImageUrl,
  onCrop,
  onRotateImage,
  onRefineEdges,
  onUndo,
  canUndo,
  hasUploadedFile,
  originalFile,
  darkMode,
  onDarkModeChange,
}) {
  const [showCropModal, setShowCropModal] = useState(false)
  const [selectedAspectRatio, setSelectedAspectRatio] = useState(null)
  const [isCropMenuHovered, setIsCropMenuHovered] = useState(false)
  const [isRefineMenuHovered, setIsRefineMenuHovered] = useState(false)
  const location = useLocation()
  
  // State for threshold input
  const [thresholdInput, setThresholdInput] = useState(String(threshold))
  const [isInputFocused, setIsInputFocused] = useState(false)

  // Update threshold input when threshold changes (only if input is not focused)
  useEffect(() => {
    if (!isInputFocused) {
      setThresholdInput(String(threshold))
    }
  }, [threshold, isInputFocused])

  // Handle threshold input change
  const handleThresholdInputChange = (e) => {
    const value = e.target.value
    
    if (value === '' || /^\d+$/.test(value)) {
      setThresholdInput(value === '' ? '' : value)
      
      const oldInputValue = thresholdInput === '' ? 0 : parseInt(thresholdInput) || 0
      const newInputValue = value === '' ? 0 : parseInt(value) || 0
      
      const isSpinnerClick = value !== '' && 
                            /^\d+$/.test(value) && 
                            oldInputValue !== 0 &&
                            Math.abs(newInputValue - oldInputValue) === 1
      
      if (isSpinnerClick) {
        if (!liveUpdate) {
          onLiveUpdateChange(true)
        }
        const clampedValue = Math.max(0, Math.min(100, newInputValue))
        onThresholdChange(clampedValue)
      }
    }
  }

  // Handle threshold input commit
  const handleThresholdInputCommit = (e) => {
    let value = e.target.value
    if (value === '' || isNaN(parseInt(value))) {
      value = threshold
    } else {
      value = parseInt(value)
    }
    const clampedValue = Math.max(0, Math.min(100, value))
    setThresholdInput(String(clampedValue))
    onThresholdChange(clampedValue)
    setIsInputFocused(false)
  }

  // Handle input focus
  const handleThresholdInputFocus = () => {
    setIsInputFocused(true)
    if (liveUpdate) {
      onLiveUpdateChange(false)
    }
  }

  // Handle key down for Enter key
  const handleThresholdInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      
      let value = e.target.value
      if (value === '' || isNaN(parseInt(value))) {
        value = threshold
      } else {
        value = parseInt(value)
      }
      const clampedValue = Math.max(0, Math.min(100, value))
      setThresholdInput(String(clampedValue))
      onThresholdChange(clampedValue)
      setIsInputFocused(false)
      
      e.target.blur()
      
      if (!liveUpdate) {
        onLiveUpdateChange(true)
      }
    }
  }

  // Handle precision increment/decrement
  const handleDecrement = () => {
    if (!liveUpdate) {
      onLiveUpdateChange(true)
    }
    const newThreshold = Math.max(0, threshold - 1)
    onThresholdChange(newThreshold)
  }

  const handleIncrement = () => {
    if (!liveUpdate) {
      onLiveUpdateChange(true)
    }
    const newThreshold = Math.min(100, threshold + 1)
    onThresholdChange(newThreshold)
  }

  // Handle slider change
  const handleSliderChange = (e) => {
    if (!liveUpdate) {
      onLiveUpdateChange(true)
    }
    const newThreshold = parseInt(e.target.value)
    onThresholdChange(newThreshold)
  }

  const handleCropOptionClick = (aspectRatio) => {
    setSelectedAspectRatio(aspectRatio)
    setShowCropModal(true)
  }

  const handleCropApply = (cropX, cropY, cropWidth, cropHeight) => {
    if (onCrop && selectedAspectRatio) {
      onCrop(selectedAspectRatio, cropX, cropY, cropWidth, cropHeight)
    }
    setShowCropModal(false)
    setSelectedAspectRatio(null)
  }

  const handleCropCancel = () => {
    setShowCropModal(false)
    setSelectedAspectRatio(null)
  }

  return (
    <div className="removal-controls">
      <div className="controls-header">
        <div className="header-row">
          <div className="header-left">
            {hasUploadedFile && (
              <>
                {/* Refine dropdown */}
                <div 
                  className="refine-button-container"
                  onMouseEnter={() => setIsRefineMenuHovered(true)}
                  onMouseLeave={() => setIsRefineMenuHovered(false)}
                >
                  <button
                    className="refine-button"
                    disabled={!hasUploadedFile}
                  >
                    Refine
                  </button>
                  {isRefineMenuHovered && (
                    <div className="refine-menu">
                      <button onClick={() => onRefineEdges && onRefineEdges(1)}>Light Refine</button>
                      <button onClick={() => onRefineEdges && onRefineEdges(2)}>Medium Refine</button>
                      <button onClick={() => onRefineEdges && onRefineEdges(3)}>Strong Refine</button>
                      <div className="menu-separator"></div>
                      <button 
                        onClick={onUndo}
                        disabled={!canUndo}
                        title="Undo Last (Ctrl+Z)"
                      >
                        Undo Last
                      </button>
                    </div>
                  )}
                </div>

                {/* Method dropdown */}
                <div className="header-method-select">
                  <select value={method} onChange={(e) => onMethodChange(e.target.value)} className="method-select-header">
                    <option value="edge-detect">Edge Detect - flood fill from corners (best for photos)</option>
                    <option value="color-key">Color Key - remove specific color (green screen)</option>
                    <option value="luminance">Luminance - remove by brightness (white backgrounds)</option>
                  </select>
                </div>
              </>
            )}
            {showCropModal && originalFile && (
              <CropPreviewModal
                originalFile={originalFile}
                aspectRatio={selectedAspectRatio}
                onCrop={handleCropApply}
                onCancel={handleCropCancel}
                onRotateImage={onRotateImage}
              />
            )}
          </div>
          <div className="header-right">
            {hasUploadedFile && (
              <>
                {/* Crop dropdown */}
                <div 
                  className="crop-button-container"
                  onMouseEnter={() => setIsCropMenuHovered(true)}
                  onMouseLeave={() => setIsCropMenuHovered(false)}
                >
                  <button
                    className="crop-button"
                    disabled={!hasUploadedFile}
                  >
                    Crop
                  </button>
                  {isCropMenuHovered && (
                    <div className="crop-menu">
                      <button onClick={() => handleCropOptionClick('1:1')}>1:1 (Square)</button>
                      <button onClick={() => handleCropOptionClick('3:2')}>3:2 (Photo)</button>
                      <button onClick={() => handleCropOptionClick('4:3')}>4:3 (Traditional)</button>
                      <div className="menu-separator"></div>
                      <button 
                        onClick={onUndo}
                        disabled={!canUndo}
                        title="Undo Last (Ctrl+Z)"
                      >
                        Undo Last
                      </button>
                    </div>
                  )}
                </div>

                {/* Threshold input */}
                <div className="header-threshold-input">
                  <div className="threshold-input-container-header">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={thresholdInput}
                      onChange={handleThresholdInputChange}
                      onBlur={handleThresholdInputCommit}
                      onFocus={handleThresholdInputFocus}
                      onKeyDown={handleThresholdInputKeyDown}
                      className="threshold-input-header"
                      aria-label="Threshold percentage"
                      title="Press Enter or Live Update"
                    />
                    <span className="threshold-label-header">%</span>
                  </div>
                </div>

                {/* Live Update toggle */}
                <label className="toggle-label">
                  <span>Live Update</span>
                  <input
                    type="checkbox"
                    checked={liveUpdate}
                    onChange={(e) => onLiveUpdateChange(e.target.checked)}
                    className="toggle-switch"
                  />
                </label>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="controls-content">
        <div className="input-group">
          <label>
            <div className="slider-container">
              <button 
                className="precision-button precision-button-left" 
                onClick={handleDecrement}
                aria-label="Decrease threshold by 1"
              >
                &lt;
              </button>
              <span className="slider-label">Less</span>
              <input
                type="range"
                min="0"
                max="100"
                value={threshold}
                onChange={handleSliderChange}
                className="threshold-slider"
              />
              <span className="slider-label">More</span>
              <button 
                className="precision-button precision-button-right" 
                onClick={handleIncrement}
                aria-label="Increase threshold by 1"
              >
                &gt;
              </button>
            </div>
          </label>
        </div>

        {/* Edge feather control - only show for edge-detect and color-key methods */}
        {(method === 'edge-detect' || method === 'color-key') && (
          <div className="feather-control">
            <label className="feather-label">
              Edge Feather:
              <input
                type="range"
                min="0"
                max="10"
                value={edgeFeather}
                onChange={(e) => onEdgeFeatherChange(parseInt(e.target.value))}
                className="feather-slider"
              />
              <span className="feather-value">{edgeFeather}px</span>
            </label>
          </div>
        )}

        {/* Background color picker - only show for color-key method */}
        {method === 'color-key' && (
          <div className="color-picker-control">
            <label className="color-picker-label">
              Background Color:
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => onBackgroundColorChange(e.target.value)}
                className="color-picker-input"
              />
              <span className="color-value">{backgroundColor}</span>
            </label>
          </div>
        )}

        {imageDimensions.width > 0 && (
          <div className="info-text">
            <small>
              Image: {imageDimensions.width}×{imageDimensions.height} px
              <br />
              Method: {method === 'edge-detect' ? 'Edge Detection' : method === 'color-key' ? 'Color Key' : 'Luminance'} | Threshold: {threshold}%
            </small>
            <div className="info-text-nav-buttons">
              <Link 
                to="/" 
                className={`nav-mode-button ${location.pathname === '/' ? 'active' : ''}`}
                title="Single Mode"
              >
                Single
              </Link>
              <Link 
                to="/batch" 
                className={`nav-mode-button ${location.pathname === '/batch' ? 'active' : ''}`}
                title="Batch Mode"
              >
                Batch
              </Link>
            </div>
            <div className="info-text-buttons">
              {processedImageUrl && (
                <button className="download-button-info" onClick={onDownload} title="Download">
                  ⬇️
                </button>
              )}
              {onDarkModeChange && (
                <button className="theme-toggle-info" onClick={() => onDarkModeChange(!darkMode)} title="Light/Dark Mode">
                  {darkMode ? '☀️' : '🌙'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RemovalControls

