import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import JSZip from 'jszip'
import BatchInfoBox from '../components/BatchNoBG/BatchInfoBox'
import BatchThumbnailsGrid from '../components/BatchNoBG/BatchThumbnailsGrid'
import BatchPreviewInfoCard from '../components/BatchNoBG/BatchPreviewInfoCard'
import BatchImagePreviewModal from '../components/BatchNoBG/BatchImagePreviewModal'
import BatchCropModal from '../components/BatchNoBG/BatchCropModal'
import InfoModal from '../components/InfoModal'
import { getSettings, saveSettings } from '../utils/settings-manager'
import { 
  loadMainImage, 
  getProcessedImageUrl, 
  getProcessedImageInfo, 
  saveBatchImages, 
  loadBatchImages, 
  clearBatchImages 
} from '../utils/image-state-manager'
import { removeBackground } from '../utils/removal-client'
import { batchCropImages } from '../utils/image-manipulation'
import './NoBGBatch.css'

function NoBGBatch() {
  const navigate = useNavigate()
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('nobg_dark_mode')
    return saved ? JSON.parse(saved) : false
  })
  
  // Target image state (from single mode)
  const [targetImageFile, setTargetImageFile] = useState(null)
  const [targetImageUrl, setTargetImageUrl] = useState(null)
  const [originalTargetImageUrl, setOriginalTargetImageUrl] = useState(null)
  const [targetImageDimensions, setTargetImageDimensions] = useState(null)
  
  // Batch files state
  const [batchFiles, setBatchFiles] = useState([])
  const [results, setResults] = useState([])
  const [processedImageUrls, setProcessedImageUrls] = useState({})
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Settings from single mode
  const [threshold, setThreshold] = useState(50)
  const [removalMethod, setRemovalMethod] = useState('edge-detect')
  
  // Modal states
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [previewImageIndex, setPreviewImageIndex] = useState(0)
  
  // Refs
  const fileInputRef = useRef(null)

  // Apply dark mode to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
    localStorage.setItem('nobg_dark_mode', JSON.stringify(darkMode))
  }, [darkMode])

  // Load target image and settings on mount
  useEffect(() => {
    const loadData = async () => {
      // Load settings
      const settings = getSettings()
      setThreshold(settings.removalThreshold || 50)
      setRemovalMethod(settings.removalMethod || 'edge-detect')
      
      // Load target image from single mode
      const mainImage = await loadMainImage()
      if (mainImage) {
        setTargetImageFile(mainImage.file)
        setTargetImageDimensions(mainImage.dimensions)
        
        // Get the processed image URL if available
        const processedUrl = getProcessedImageUrl()
        if (processedUrl) {
          setTargetImageUrl(processedUrl)
          setOriginalTargetImageUrl(URL.createObjectURL(mainImage.file))
        } else {
          setTargetImageUrl(URL.createObjectURL(mainImage.file))
        }
      }
      
      // Load batch images
      const savedBatchFiles = await loadBatchImages()
      if (savedBatchFiles.length > 0) {
        setBatchFiles(savedBatchFiles)
      }
    }
    
    loadData()
  }, [])

  // Save batch files when they change
  useEffect(() => {
    if (batchFiles.length > 0) {
      saveBatchImages(batchFiles)
    }
  }, [batchFiles])

  // Handle file upload
  const handleFileUpload = useCallback((e) => {
    const files = Array.from(e.target.files)
    const validFiles = files.filter(file => 
      file.type === 'image/jpeg' || 
      file.type === 'image/jpg' || 
      file.type === 'image/png'
    ).slice(0, 48 - batchFiles.length) // Max 48 images
    
    if (validFiles.length > 0) {
      setBatchFiles(prev => [...prev, ...validFiles])
      // Reset results when adding new files
      setResults([])
      setProcessedImageUrls({})
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [batchFiles.length])

  // Remove a batch file
  const handleRemoveBatchFile = useCallback((index) => {
    setBatchFiles(prev => prev.filter((_, i) => i !== index))
    // Adjust results
    setResults(prev => {
      const newResults = [...prev]
      // If target is included, batch files start at index 1
      const resultIndex = targetImageFile ? index + 1 : index
      newResults.splice(resultIndex, 1)
      return newResults
    })
    setProcessedImageUrls(prev => {
      const newUrls = { ...prev }
      const resultIndex = targetImageFile ? index + 1 : index
      delete newUrls[resultIndex]
      // Reindex remaining
      const reindexed = {}
      Object.keys(newUrls).forEach(key => {
        const keyNum = parseInt(key)
        if (keyNum > resultIndex) {
          reindexed[keyNum - 1] = newUrls[key]
        } else {
          reindexed[key] = newUrls[key]
        }
      })
      return reindexed
    })
  }, [targetImageFile])

  // Process all images
  const handleProcessAll = useCallback(async () => {
    if (isProcessing) return
    
    // Build list of all files to process (target + batch)
    const allFiles = []
    if (targetImageFile) {
      allFiles.push({ file: targetImageFile, isTarget: true })
    }
    batchFiles.forEach(file => {
      allFiles.push({ file, isTarget: false })
    })
    
    if (allFiles.length === 0) return
    
    setIsProcessing(true)
    
    // Initialize results
    const initialResults = allFiles.map(() => ({ status: 'pending', progress: 0 }))
    setResults(initialResults)
    
    // Process each file
    for (let i = 0; i < allFiles.length; i++) {
      const { file } = allFiles[i]
      
      // Update status to processing
      setResults(prev => {
        const newResults = [...prev]
        newResults[i] = { status: 'processing', progress: 0 }
        return newResults
      })
      
      try {
        const processedBlob = await removeBackground(
          file,
          threshold,
          removalMethod,
          (progress) => {
            setResults(prev => {
              const newResults = [...prev]
              newResults[i] = { ...newResults[i], progress }
              return newResults
            })
          }
        )
        
        // Create URL for processed image
        const processedUrl = URL.createObjectURL(processedBlob)
        
        setProcessedImageUrls(prev => ({
          ...prev,
          [i]: processedUrl
        }))
        
        setResults(prev => {
          const newResults = [...prev]
          newResults[i] = { status: 'completed', progress: 100, blob: processedBlob }
          return newResults
        })
      } catch (error) {
        console.error(`Error processing image ${i}:`, error)
        setResults(prev => {
          const newResults = [...prev]
          newResults[i] = { status: 'error', progress: 0, error: error.message }
          return newResults
        })
      }
    }
    
    setIsProcessing(false)
  }, [targetImageFile, batchFiles, threshold, removalMethod, isProcessing])

  // Download all processed images as ZIP
  const handleDownloadZip = useCallback(async () => {
    const completedResults = results.filter(r => r.status === 'completed' && r.blob)
    if (completedResults.length === 0) return
    
    const zip = new JSZip()
    
    // Add target image if processed
    if (targetImageFile && results[0]?.blob) {
      const ext = 'png' // Output is always PNG for transparency
      const filename = `target_nobg.${ext}`
      zip.file(filename, results[0].blob)
    }
    
    // Add batch images
    batchFiles.forEach((file, index) => {
      const resultIndex = targetImageFile ? index + 1 : index
      const result = results[resultIndex]
      if (result?.blob) {
        const baseName = file.name.replace(/\.[^/.]+$/, '')
        const filename = `${baseName}_nobg.png`
        zip.file(filename, result.blob)
      }
    })
    
    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nobg_batch_${Date.now()}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [results, targetImageFile, batchFiles])

  // Clear batch
  const handleClearBatch = useCallback(() => {
    setBatchFiles([])
    setResults([])
    setProcessedImageUrls({})
    clearBatchImages()
  }, [])

  // Handle thumbnail click for preview
  const handleThumbnailClick = useCallback((imageUrl, imageName, imageDimensions, index) => {
    setPreviewImage({
      url: imageUrl,
      name: imageName,
      dimensions: imageDimensions
    })
    setPreviewImageIndex(index)
    setShowPreviewModal(true)
  }, [])

  // Navigate preview
  const handlePreviewNavigate = useCallback((direction) => {
    const totalImages = (targetImageFile ? 1 : 0) + batchFiles.length
    let newIndex = previewImageIndex
    
    if (direction === 'prev') {
      newIndex = Math.max(0, previewImageIndex - 1)
    } else {
      newIndex = Math.min(totalImages - 1, previewImageIndex + 1)
    }
    
    if (newIndex !== previewImageIndex) {
      setPreviewImageIndex(newIndex)
      
      // Get the image at new index
      if (newIndex === 0 && targetImageFile) {
        setPreviewImage({
          url: processedImageUrls[0] || targetImageUrl,
          name: 'Target Image',
          dimensions: targetImageDimensions
        })
      } else {
        const batchIndex = targetImageFile ? newIndex - 1 : newIndex
        const file = batchFiles[batchIndex]
        if (file) {
          setPreviewImage({
            url: processedImageUrls[newIndex] || URL.createObjectURL(file),
            name: file.name,
            dimensions: null
          })
        }
      }
    }
  }, [previewImageIndex, targetImageFile, targetImageUrl, targetImageDimensions, batchFiles, processedImageUrls])

  // Handle batch crop
  const handleBatchCrop = useCallback(() => {
    if (batchFiles.length === 0 && !targetImageFile) return
    setShowCropModal(true)
  }, [batchFiles, targetImageFile])

  // Apply batch crop
  const handleApplyCrop = useCallback(async (cropData) => {
    setShowCropModal(false)
    
    // Build files array (target first if exists)
    const allFiles = []
    if (targetImageFile) {
      allFiles.push(targetImageFile)
    }
    allFiles.push(...batchFiles)
    
    try {
      const croppedFiles = await batchCropImages(allFiles, cropData)
      
      // Separate target and batch files
      if (targetImageFile) {
        setTargetImageFile(croppedFiles[0])
        setTargetImageUrl(URL.createObjectURL(croppedFiles[0]))
        setBatchFiles(croppedFiles.slice(1))
      } else {
        setBatchFiles(croppedFiles)
      }
      
      // Clear processed results since images changed
      setResults([])
      setProcessedImageUrls({})
    } catch (error) {
      console.error('Error applying batch crop:', error)
    }
  }, [targetImageFile, batchFiles])

  // Handle batch refine (placeholder for edge refinement)
  const handleBatchRefine = useCallback(() => {
    console.log('Batch refine - feature coming soon')
  }, [])

  // Check if download is available
  const canDownload = results.some(r => r.status === 'completed')
  const totalBatchCount = (targetImageFile ? 1 : 0) + batchFiles.length

  // Build preview info card if there are results
  const previewInfoCard = results.length > 0 ? (
    <BatchPreviewInfoCard
      results={results}
      processedImageInfo={{ removalMethod, threshold }}
      onClear={() => {
        setResults([])
        setProcessedImageUrls({})
      }}
      onDownloadZip={handleDownloadZip}
    />
  ) : null

  return (
    <div className={`nobg-batch-page ${darkMode ? 'dark-mode' : ''}`}>
      <div className="nobg-batch-container">
        <BatchInfoBox
          mainImage={targetImageFile}
          mainImageDimensions={targetImageDimensions}
          threshold={threshold}
          removalMethod={removalMethod}
          batchCount={totalBatchCount}
          onUpload={() => fileInputRef.current?.click()}
          onDownload={handleDownloadZip}
          onProcessAll={handleProcessAll}
          onBatchCrop={handleBatchCrop}
          onBatchRefine={handleBatchRefine}
          onClear={handleClearBatch}
          showProcessButtons={totalBatchCount > 0}
          canDownload={canDownload}
          darkMode={darkMode}
          onDarkModeChange={setDarkMode}
        />
        
        <BatchThumbnailsGrid
          targetImageUrl={targetImageUrl}
          originalTargetImageUrl={originalTargetImageUrl}
          files={batchFiles}
          onRemove={handleRemoveBatchFile}
          onUploadClick={() => fileInputRef.current?.click()}
          onTargetImageChange={() => navigate('/')}
          disabled={isProcessing}
          results={results}
          processedImageUrls={processedImageUrls}
          previewInfoCard={previewInfoCard}
          onThumbnailClick={handleThumbnailClick}
          hasTargetImage={!!targetImageFile}
        />
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>
      
      {/* Footer */}
      <footer className="nobg-batch-footer">
        <span>noBG Batch</span>
        <span className="footer-separator">|</span>
        <button 
          className="footer-info-button" 
          onClick={() => setShowInfoModal(true)}
          title="Usage Guide"
        >
          ℹ️
        </button>
      </footer>
      
      {/* Modals */}
      <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />
      
      {showPreviewModal && previewImage && (
        <BatchImagePreviewModal
          imageUrl={previewImage.url}
          imageName={previewImage.name}
          imageDimensions={previewImage.dimensions}
          originalImageUrl={previewImageIndex === 0 && targetImageFile ? originalTargetImageUrl : null}
          originalImageDimensions={previewImageIndex === 0 ? targetImageDimensions : null}
          isTargetImage={previewImageIndex === 0 && !!targetImageFile}
          hasProcessed={!!processedImageUrls[previewImageIndex]}
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          currentIndex={previewImageIndex}
          totalImages={totalBatchCount}
          onNavigate={handlePreviewNavigate}
        />
      )}
      
      {showCropModal && (
        <BatchCropModal
          files={targetImageFile ? [targetImageFile, ...batchFiles] : batchFiles}
          targetImageFile={targetImageFile}
          onApply={handleApplyCrop}
          onCancel={() => setShowCropModal(false)}
        />
      )}
    </div>
  )
}

export default NoBGBatch

