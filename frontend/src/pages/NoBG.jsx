import React, { useState, useEffect, useRef, useCallback } from 'react'
import ImageUpload from '../components/ImageUpload'
import RemovalControls from '../components/RemovalControls'
import ImagePreview from '../components/ImagePreview'
import InfoModal from '../components/InfoModal'
import { cropImage, rotateImage90CW, refineEdges } from '../utils/image-manipulation'
import { removeBackground, detectBackgroundColor } from '../utils/removal-client'
import { saveSettings, loadSettings, getDefaultSettings } from '../utils/settings-manager'
import { 
  saveMainImage, 
  loadMainImage, 
  saveProcessedImage, 
  loadProcessedImage, 
  clearMainImage, 
  clearProcessedImage 
} from '../utils/image-state-manager'
import '../App.css'

function NoBG() {
  // State
  const [uploadedFile, setUploadedFile] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [processedImageUrl, setProcessedImageUrl] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [undoHistory, setUndoHistory] = useState([])
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('nobg_darkMode')
    return saved === 'true'
  })
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [downloadCount, setDownloadCount] = useState(() => {
    const saved = localStorage.getItem('nobg_downloadCount')
    return saved ? parseInt(saved) : 0
  })
  
  // Background removal settings
  const [liveUpdate, setLiveUpdate] = useState(true)
  const [threshold, setThreshold] = useState(50)
  const [removalMethod, setRemovalMethod] = useState('edge-detect')
  const [edgeFeather, setEdgeFeather] = useState(2)
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  
  // Crop state
  const [cropState, setCropState] = useState(null)
  
  // Flag to track if we're restoring from storage
  const [isRestoring, setIsRestoring] = useState(true)
  
  // Refs for tracking previous values
  const prevThresholdRef = useRef(threshold)
  const prevMethodRef = useRef(removalMethod)
  const prevFeatherRef = useRef(edgeFeather)
  const prevBgColorRef = useRef(backgroundColor)
  const processTimeoutRef = useRef(null)

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = loadSettings()
    if (savedSettings) {
      if (savedSettings.threshold !== undefined) setThreshold(savedSettings.threshold)
      if (savedSettings.removalMethod) setRemovalMethod(savedSettings.removalMethod)
      if (savedSettings.edgeFeather !== undefined) setEdgeFeather(savedSettings.edgeFeather)
      if (savedSettings.backgroundColor) setBackgroundColor(savedSettings.backgroundColor)
      if (savedSettings.liveUpdate !== undefined) setLiveUpdate(savedSettings.liveUpdate)
    }
  }, [])

  // Save settings when they change
  useEffect(() => {
    if (!isRestoring) {
      saveSettings({
        threshold,
        removalMethod,
        edgeFeather,
        backgroundColor,
        liveUpdate
      })
    }
  }, [threshold, removalMethod, edgeFeather, backgroundColor, liveUpdate, isRestoring])

  // Restore image from localStorage on mount
  useEffect(() => {
    const restoreState = async () => {
      try {
        const mainImage = await loadMainImage()
        if (mainImage) {
          setUploadedFile(mainImage.file)
          setImageDimensions(mainImage.dimensions)
          
          const processedData = await loadProcessedImage()
          if (processedData) {
            setProcessedImageUrl(processedData.imageUrl)
            
            // Restore settings from processed image info
            if (processedData.imageInfo) {
              if (processedData.imageInfo.threshold !== undefined) {
                setThreshold(processedData.imageInfo.threshold)
              }
              if (processedData.imageInfo.removalMethod) {
                setRemovalMethod(processedData.imageInfo.removalMethod)
              }
              if (processedData.imageInfo.edgeFeather !== undefined) {
                setEdgeFeather(processedData.imageInfo.edgeFeather)
              }
              if (processedData.imageInfo.liveUpdate !== undefined) {
                setLiveUpdate(processedData.imageInfo.liveUpdate)
              }
              if (processedData.imageInfo.cropState) {
                setCropState(processedData.imageInfo.cropState)
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to restore state:', error)
      } finally {
        setIsRestoring(false)
      }
    }
    
    restoreState()
  }, [])

  // Handle file upload
  const handleFileUpload = useCallback(async (file) => {
    setError(null)
    setUploadedFile(file)
    setProcessedImage(null)
    setProcessedImageUrl(null)
    setUndoHistory([])
    setCropState(null)
    
    // Get image dimensions
    const img = new Image()
    img.onload = async () => {
      const dims = { width: img.width, height: img.height }
      setImageDimensions(dims)
      
      // Save to localStorage
      await saveMainImage(file, dims, file.name)
      
      // Auto-detect background color for color-key method
      if (removalMethod === 'color-key') {
        try {
          const detectedColor = await detectBackgroundColor(file)
          setBackgroundColor(detectedColor)
        } catch (e) {
          console.warn('Could not detect background color:', e)
        }
      }
    }
    img.src = URL.createObjectURL(file)
  }, [removalMethod])

  // Handle image change (reset)
  const handleImageChange = useCallback(() => {
    setUploadedFile(null)
    setProcessedImage(null)
    setProcessedImageUrl(null)
    setImageDimensions({ width: 0, height: 0 })
    setUndoHistory([])
    setCropState(null)
    setError(null)
    
    // Clear localStorage
    clearMainImage()
    clearProcessedImage()
  }, [])

  // Process image (remove background)
  const processImage = useCallback(async () => {
    if (!uploadedFile || processing) return
    
    setProcessing(true)
    setError(null)
    
    try {
      const blob = await removeBackground(
        uploadedFile,
        threshold,
        removalMethod,
        edgeFeather,
        backgroundColor,
        (progress) => {
          // Progress callback - could update UI
        }
      )
      
      const url = URL.createObjectURL(blob)
      setProcessedImage(blob)
      setProcessedImageUrl(url)
      
      // Save to localStorage
      await saveProcessedImage(blob, {
        originalDimensions: imageDimensions,
        threshold,
        removalMethod,
        edgeFeather,
        backgroundColor,
        liveUpdate,
        cropState
      })
      
    } catch (err) {
      console.error('Processing failed:', err)
      setError(err.message || 'Failed to remove background')
    } finally {
      setProcessing(false)
    }
  }, [uploadedFile, threshold, removalMethod, edgeFeather, backgroundColor, imageDimensions, liveUpdate, cropState, processing])

  // Live update effect
  useEffect(() => {
    if (!uploadedFile || isRestoring) return
    
    // Check if any settings changed
    const thresholdChanged = prevThresholdRef.current !== threshold
    const methodChanged = prevMethodRef.current !== removalMethod
    const featherChanged = prevFeatherRef.current !== edgeFeather
    const bgColorChanged = prevBgColorRef.current !== backgroundColor
    
    // Update refs
    prevThresholdRef.current = threshold
    prevMethodRef.current = removalMethod
    prevFeatherRef.current = edgeFeather
    prevBgColorRef.current = backgroundColor
    
    if (liveUpdate && (thresholdChanged || methodChanged || featherChanged || bgColorChanged)) {
      // Debounce processing
      if (processTimeoutRef.current) {
        clearTimeout(processTimeoutRef.current)
      }
      
      processTimeoutRef.current = setTimeout(() => {
        processImage()
      }, 150)
    }
    
    return () => {
      if (processTimeoutRef.current) {
        clearTimeout(processTimeoutRef.current)
      }
    }
  }, [uploadedFile, threshold, removalMethod, edgeFeather, backgroundColor, liveUpdate, isRestoring, processImage])

  // Handle crop
  const handleCrop = useCallback(async (aspectRatio, cropX, cropY, cropWidth, cropHeight) => {
    if (!uploadedFile) return
    
    // Save to undo history
    setUndoHistory(prev => [...prev, { file: uploadedFile, dimensions: imageDimensions }])
    
    try {
      const croppedFile = await cropImage(uploadedFile, aspectRatio, cropX, cropY, cropWidth, cropHeight)
      
      // Get new dimensions
      const img = new Image()
      img.onload = async () => {
        const newDims = { width: img.width, height: img.height }
        setImageDimensions(newDims)
        setUploadedFile(croppedFile)
        setCropState({ aspectRatio, cropX, cropY, cropWidth, cropHeight })
        
        // Save to localStorage
        await saveMainImage(croppedFile, newDims, croppedFile.name)
        
        // Re-process with new cropped image
        if (liveUpdate) {
          processImage()
        }
      }
      img.src = URL.createObjectURL(croppedFile)
      
    } catch (err) {
      console.error('Crop failed:', err)
      setError('Failed to crop image')
    }
  }, [uploadedFile, imageDimensions, liveUpdate, processImage])

  // Handle rotate
  const handleRotateImage = useCallback(async () => {
    if (!uploadedFile) return
    
    // Save to undo history
    setUndoHistory(prev => [...prev, { file: uploadedFile, dimensions: imageDimensions }])
    
    try {
      const rotatedFile = await rotateImage90CW(uploadedFile)
      
      // Swap dimensions
      const newDims = { width: imageDimensions.height, height: imageDimensions.width }
      setImageDimensions(newDims)
      setUploadedFile(rotatedFile)
      
      // Save to localStorage
      await saveMainImage(rotatedFile, newDims, rotatedFile.name)
      
      // Re-process
      if (liveUpdate) {
        processImage()
      }
      
    } catch (err) {
      console.error('Rotate failed:', err)
      setError('Failed to rotate image')
    }
  }, [uploadedFile, imageDimensions, liveUpdate, processImage])

  // Handle edge refinement
  const handleRefineEdges = useCallback(async (radius) => {
    if (!uploadedFile) return
    
    // Save to undo history
    setUndoHistory(prev => [...prev, { file: uploadedFile, dimensions: imageDimensions }])
    
    try {
      const refinedFile = await refineEdges(uploadedFile, radius)
      setUploadedFile(refinedFile)
      
      // Save to localStorage
      await saveMainImage(refinedFile, imageDimensions, refinedFile.name)
      
      // Re-process
      if (liveUpdate) {
        processImage()
      }
      
    } catch (err) {
      console.error('Refine edges failed:', err)
      setError('Failed to refine edges')
    }
  }, [uploadedFile, imageDimensions, liveUpdate, processImage])

  // Handle undo
  const handleUndo = useCallback(async () => {
    if (undoHistory.length === 0) return
    
    const lastState = undoHistory[undoHistory.length - 1]
    setUndoHistory(prev => prev.slice(0, -1))
    
    setUploadedFile(lastState.file)
    setImageDimensions(lastState.dimensions)
    
    // Save to localStorage
    await saveMainImage(lastState.file, lastState.dimensions, lastState.file.name)
    
    // Re-process
    if (liveUpdate) {
      processImage()
    }
  }, [undoHistory, liveUpdate, processImage])

  // Check if undo is available
  const canUndo = useCallback(() => {
    return undoHistory.length > 0
  }, [undoHistory])

  // Handle download
  const handleDownload = useCallback(() => {
    if (!processedImageUrl) return
    
    const link = document.createElement('a')
    link.href = processedImageUrl
    
    // Generate filename
    const originalName = uploadedFile?.name || 'image'
    const baseName = originalName.replace(/\.[^/.]+$/, '')
    link.download = `${baseName}_nobg.png`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Update download count
    const newCount = downloadCount + 1
    setDownloadCount(newCount)
    localStorage.setItem('nobg_downloadCount', String(newCount))
  }, [processedImageUrl, uploadedFile, downloadCount])

  // Handle dark mode toggle
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode)
    localStorage.setItem('nobg_darkMode', String(darkMode))
  }, [darkMode])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo])

  // Handle live update change
  const handleLiveUpdateChange = useCallback((value) => {
    setLiveUpdate(value)
    if (value && uploadedFile) {
      processImage()
    }
  }, [uploadedFile, processImage])

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      <div className="app-content">
        {!uploadedFile ? (
          <div className="upload-section">
            <ImageUpload onFileUpload={handleFileUpload} />
            {error && <div className="error-message">{error}</div>}
          </div>
        ) : (
          <>
            <div className="image-display-section">
              <ImagePreview
                originalFile={uploadedFile}
                processedImageUrl={processedImageUrl}
                onImageChange={handleImageChange}
              />
              {error && <div className="error-message">{error}</div>}
            </div>

            <div className="controls-section">
              <RemovalControls
                liveUpdate={liveUpdate}
                onLiveUpdateChange={handleLiveUpdateChange}
                threshold={threshold}
                onThresholdChange={setThreshold}
                method={removalMethod}
                onMethodChange={setRemovalMethod}
                edgeFeather={edgeFeather}
                onEdgeFeatherChange={setEdgeFeather}
                backgroundColor={backgroundColor}
                onBackgroundColorChange={setBackgroundColor}
                imageDimensions={imageDimensions}
                onDownload={handleDownload}
                onProcess={processImage}
                processedImageUrl={processedImageUrl}
                onCrop={handleCrop}
                onRotateImage={handleRotateImage}
                onRefineEdges={handleRefineEdges}
                onUndo={handleUndo}
                canUndo={canUndo()}
                hasUploadedFile={!!uploadedFile}
                originalFile={uploadedFile}
                darkMode={darkMode}
                onDarkModeChange={setDarkMode}
              />
            </div>
          </>
        )}
      </div>

      <footer className="app-footer">
        <button 
          className="footer-info-button" 
          onClick={() => setShowInfoModal(true)}
          title="App Usage Guide"
        >
          ⓘ
        </button>
        <span className="footer-separator">•</span>
        <a href="#" className="footer-link">Background Removal Tool</a>
        <span className="footer-separator">•</span>
        <a href="https://github.com/j031nich0145/j031nich0145/blob/main/LICENSING.md" 
           target="_blank" 
           rel="noopener noreferrer" 
           className="footer-link">
          Commercial Use License
        </a>
        <span className="footer-separator">•</span>
        <a href="https://github.com/j031nich0145/j031nich0145/" 
           target="_blank" 
           rel="noopener noreferrer" 
           className="footer-link">
          Buy Us Coffee
        </a>
      </footer>

      <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />
    </div>
  )
}

export default NoBG

