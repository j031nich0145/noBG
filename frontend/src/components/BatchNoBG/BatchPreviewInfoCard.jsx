import './BatchPreviewInfoCard.css'

function BatchPreviewInfoCard({ results, processedImageInfo, onClear, onDownloadZip }) {
  const completedCount = results.filter(r => r.status === 'completed').length
  const totalCount = results.length
  const errorCount = results.filter(r => r.status === 'error').length

  return (
    <div className="batch-preview-info-card">
      <div className="preview-info-header">
        <span className="preview-info-title">✓ Processed</span>
        <span className="preview-info-count">{completedCount}/{totalCount}</span>
      </div>
      
      {errorCount > 0 && (
        <div className="preview-info-errors">
          {errorCount} error{errorCount !== 1 ? 's' : ''}
        </div>
      )}

      <div className="preview-info-details">
        <small>
          Method: {processedImageInfo?.removalMethod || 'edge-detect'}
          <br />
          Threshold: {processedImageInfo?.threshold || 50}%
        </small>
      </div>

      <div className="preview-info-actions">
        <button 
          className="preview-download-button"
          onClick={onDownloadZip}
          disabled={completedCount === 0}
          title="Download as ZIP"
        >
          ⬇️ ZIP
        </button>
        <button 
          className="preview-clear-button"
          onClick={onClear}
          title="Clear Results"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

export default BatchPreviewInfoCard

