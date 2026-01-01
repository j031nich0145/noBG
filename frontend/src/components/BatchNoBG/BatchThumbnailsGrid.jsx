import { useEffect, useState } from 'react'
import './BatchThumbnailsGrid.css'

function BatchThumbnailsGrid({ targetImageUrl, originalTargetImageUrl, files, onRemove, onUploadClick, onTargetImageChange, disabled, results, processedImageUrls, previewInfoCard, onThumbnailClick, hasTargetImage }) {
  const [urls, setUrls] = useState({})
  const [isHoveringTarget, setIsHoveringTarget] = useState(false)

  // Calculate if target is included in results (at index 0)
  const targetInResults = hasTargetImage && results && results.length > 0

  useEffect(() => {
    const newUrls = {}
    files.forEach((file, index) => {
      newUrls[index] = URL.createObjectURL(file)
    })
    setUrls(newUrls)

    return () => {
      // Cleanup all object URLs
      Object.values(newUrls).forEach(url => {
        URL.revokeObjectURL(url)
      })
    }
  }, [files])

  return (
    <div className="batch-thumbnails-grid">
      <div className="thumbnails-grid">
        {/* Target Image or Upload Placeholder (first grid item) */}
        {targetImageUrl ? (
          <div className={`thumbnail-item target-thumbnail ${targetInResults && processedImageUrls && processedImageUrls[0] ? 'thumbnail-processed' : ''}`} title="Target Image">
            <img 
              src={
                // Show processed URL if available, otherwise show original on hover
                (processedImageUrls && processedImageUrls[0]) 
                  ? processedImageUrls[0]
                  : (isHoveringTarget && originalTargetImageUrl ? originalTargetImageUrl : targetImageUrl)
              }
              alt="Target image"
              className="thumbnail-image"
              onMouseEnter={() => setIsHoveringTarget(true)}
              onMouseLeave={() => setIsHoveringTarget(false)}
              onClick={() => {
                if (onThumbnailClick) {
                  onThumbnailClick(processedImageUrls?.[0] || targetImageUrl, 'Target Image', null, 0)
                }
              }}
              style={{ cursor: onThumbnailClick ? 'pointer' : 'default' }}
            />
            {onTargetImageChange && (
              <div className="thumbnail-overlay">
                <button
                  className="remove-thumbnail-button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTargetImageChange()
                  }}
                  disabled={disabled}
                  title="Adjust Target Image"
                >
                  ×
                </button>
              </div>
            )}
            {/* Progress bar overlay for target image */}
            {targetInResults && results[0] && results[0].status === 'processing' && (
              <div className="thumbnail-progress-overlay">
                <div 
                  className="thumbnail-progress-bar"
                  style={{ width: `${results[0].progress || 0}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <button 
            className="upload-placeholder-button"
            onClick={onUploadClick}
            disabled={disabled}
            title="Upload Target Image"
          >
            <div className="upload-placeholder-icon">⬆️</div>
            <div className="upload-placeholder-text">Upload Target</div>
          </button>
        )}

        {/* Batch Thumbnails */}
        {files && files.map((file, index) => {
          // Calculate result index: if target is in results, batch files start at index 1
          const resultIndex = hasTargetImage ? index + 1 : index
          
          // Use processed image URL if available, otherwise use original
          const imageUrl = processedImageUrls && processedImageUrls[resultIndex] 
            ? processedImageUrls[resultIndex] 
            : urls[index]
          const isProcessed = processedImageUrls && processedImageUrls[resultIndex]
          
          return (
          <div key={index} className={`thumbnail-item ${isProcessed ? 'thumbnail-processed' : ''}`} title={file.name}>
            {imageUrl && (
              <img 
                src={imageUrl} 
                alt={file.name}
                className="thumbnail-image"
                onClick={() => {
                  if (onThumbnailClick) {
                    // Use resultIndex for navigation (target at 0, batch files at 1+)
                    onThumbnailClick(imageUrl, file.name, null, resultIndex)
                  }
                }}
                style={{ cursor: onThumbnailClick ? 'pointer' : 'default' }}
              />
            )}
            <div className="thumbnail-overlay">
              <button
                className="remove-thumbnail-button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(index)
                }}
                disabled={disabled}
                title="Remove"
              >
                ×
              </button>
            </div>
            {/* Progress bar overlay */}
            {results && results[resultIndex] && results[resultIndex].status === 'processing' && (
              <div className="thumbnail-progress-overlay">
                <div 
                  className="thumbnail-progress-bar"
                  style={{ width: `${results[resultIndex].progress || 0}%` }}
                />
              </div>
            )}
          </div>
          )
        })}
        
        {/* Floating Preview Info Card - appears inline with thumbnails */}
        {previewInfoCard}
      </div>
    </div>
  )
}

export default BatchThumbnailsGrid

