import React, { useState, useEffect, useRef } from 'react'
import './ImagePreview.css'

function ImagePreview({ 
  originalFile, 
  processedImageUrl,
  onImageChange
}) {
  const [originalUrl, setOriginalUrl] = useState(null)
  const originalImgRef = useRef(null)
  const processedImgRef = useRef(null)

  useEffect(() => {
    if (originalFile) {
      const url = URL.createObjectURL(originalFile)
      setOriginalUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [originalFile])


  return (
    <div className="image-preview">
      <div className="preview-grid">
        <div className="preview-item">
          {originalUrl && (
            <div className="image-container original-image-container" title="Original">
              <img 
                ref={originalImgRef}
                src={originalUrl} 
                alt="Original" 
                style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
              />
              <div className="image-overlay">
                <button 
                  className="change-image-button" 
                  onClick={onImageChange}
                  title="Change image"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="preview-item">
          {processedImageUrl ? (
            <div className="image-container transparent-bg" title="Background Removed">
              <img 
                ref={processedImgRef}
                src={processedImageUrl} 
                alt="Processed"
                style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
              />
            </div>
          ) : (
            <div className="placeholder" title="Background Removed">
              <p>Adjust slider to see result</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImagePreview

