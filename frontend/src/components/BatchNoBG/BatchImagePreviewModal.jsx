import { useEffect } from 'react'
import './BatchImagePreviewModal.css'

function BatchImagePreviewModal({ 
  imageUrl, 
  imageName, 
  imageDimensions,
  originalImageUrl,
  originalImageDimensions,
  isTargetImage,
  hasProcessed,
  isOpen, 
  onClose,
  currentIndex,
  totalImages,
  onNavigate
}) {
  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate('prev')
      } else if (e.key === 'ArrowRight' && currentIndex < totalImages - 1) {
        onNavigate('next')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, currentIndex, totalImages, onNavigate])

  if (!isOpen || !imageUrl) return null

  return (
    <div className="batch-preview-modal-overlay" onClick={onClose}>
      <div className="batch-preview-modal" onClick={(e) => e.stopPropagation()}>
        <button className="batch-preview-close" onClick={onClose} title="Close">
          ×
        </button>

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <button 
            className="batch-preview-nav batch-preview-nav-prev"
            onClick={() => onNavigate('prev')}
            title="Previous image"
          >
            ‹
          </button>
        )}
        {currentIndex < totalImages - 1 && (
          <button 
            className="batch-preview-nav batch-preview-nav-next"
            onClick={() => onNavigate('next')}
            title="Next image"
          >
            ›
          </button>
        )}

        <div className="batch-preview-content">
          <div className="batch-preview-images">
            {/* Original image (if available) */}
            {originalImageUrl && (
              <div className="batch-preview-image-container">
                <h4>Original</h4>
                <img src={originalImageUrl} alt="Original" />
                {originalImageDimensions && (
                  <span className="batch-preview-dimensions">
                    {originalImageDimensions.width}×{originalImageDimensions.height}
                  </span>
                )}
              </div>
            )}

            {/* Processed image */}
            <div className="batch-preview-image-container processed">
              <h4>{hasProcessed ? 'Processed' : 'Preview'}</h4>
              <img src={imageUrl} alt={imageName} />
              {imageDimensions && (
                <span className="batch-preview-dimensions">
                  {imageDimensions.width}×{imageDimensions.height}
                </span>
              )}
            </div>
          </div>

          <div className="batch-preview-info">
            <span className="batch-preview-name">{imageName}</span>
            {isTargetImage && <span className="batch-preview-badge">Target</span>}
            <span className="batch-preview-counter">{currentIndex + 1} / {totalImages}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BatchImagePreviewModal

