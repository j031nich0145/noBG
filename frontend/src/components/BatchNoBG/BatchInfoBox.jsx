import { Link, useLocation } from 'react-router-dom'
import './BatchInfoBox.css'

function BatchInfoBox({ 
  mainImage, 
  mainImageDimensions,
  threshold,
  removalMethod,
  batchCount, 
  onUpload, 
  onDownload,
  onProcessAll,
  onBatchCrop,
  onBatchRefine,
  onClear,
  showProcessButtons,
  canDownload,
  darkMode,
  onDarkModeChange 
}) {
  const location = useLocation()

  const getMethodLabel = (method) => {
    switch(method) {
      case 'edge-detect': return 'Edge Detect'
      case 'color-key': return 'Color Key'
      case 'luminance': return 'Luminance'
      default: return method
    }
  }

  return (
    <div className="batch-info-box">
      <small>
        {mainImage && threshold !== undefined ? (
          <>
            Target Image: {mainImageDimensions?.width || 0}×{mainImageDimensions?.height || 0} px
            <br />
            Method: {getMethodLabel(removalMethod)} | Threshold: {threshold}%
          </>
        ) : (
          <>No target image loaded. Upload an image in Single Mode first.</>
        )}
      </small>
      <div className="batch-info-controls">
        <div className="batch-info-left">
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
        {showProcessButtons && (
          <>
              <button 
                className="batch-refine-button-info"
                onClick={onBatchRefine}
                title="Batch Refine - Apply edge refinement to all images"
              >
                Batch Refine
              </button>
            <button 
              className="batch-crop-button-info"
              onClick={onBatchCrop}
                title="Batch Crop - Crop all images with same dimensions"
            >
              Batch Crop
            </button>
            </>
          )}
        </div>
        <div className="batch-info-right">
          {showProcessButtons && (
            <>
            <button 
              className="process-all-button-info"
              onClick={onProcessAll}
              title={`Remove BG All (${batchCount} ${batchCount === 1 ? 'image' : 'images'})`}
            >
              Remove BG All
            </button>
            <button 
              className="clear-button-info"
              onClick={onClear}
              title="Remove Batch Images"
            >
              Clear Batch
            </button>
          </>
        )}
        <button 
          className="upload-button-info" 
          onClick={onUpload} 
          title="Upload Batch (max 48)"
        >
          ⬆️
        </button>
        <button 
          className={`download-button-info ${!canDownload ? 'disabled' : ''}`}
          onClick={canDownload ? onDownload : undefined}
          disabled={!canDownload}
          title={canDownload ? `Download Batch of ${batchCount}` : 'Download Batch (process images first)'}
        >
          ⬇️
        </button>
        {onDarkModeChange && (
          <button 
            className="theme-toggle-info" 
            onClick={() => onDarkModeChange(!darkMode)} 
            title="Light/Dark Mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        )}
        </div>
      </div>
    </div>
  )
}

export default BatchInfoBox

