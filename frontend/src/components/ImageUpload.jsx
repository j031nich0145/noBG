import React, { useRef, useState } from 'react'
import './ImageUpload.css'

function ImageUpload({ onFileUpload }) {
  const fileInputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFile = (file) => {
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      onFileUpload(file)
    } else {
      alert('Please upload a JPG or PNG image file')
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const onButtonClick = (e) => {
    e?.stopPropagation?.()
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const onUploadAreaClick = (e) => {
    // Only trigger if clicking directly on the upload area, not on buttons or other interactive elements
    // This allows clicking anywhere on the upload area to browse, as the text suggests
    if (e.target === e.currentTarget || 
        (e.target.tagName !== 'BUTTON' && !e.target.closest('button'))) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div
      className={`upload-area ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={onUploadAreaClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <div className="upload-content">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <h3>Drop an image here or click to browse</h3>
        <p>Supports JPG and PNG files (max 10MB)</p>
        <button className="browse-button" onClick={onButtonClick}>
          Browse Files
        </button>
      </div>
    </div>
  )
}

export default ImageUpload

