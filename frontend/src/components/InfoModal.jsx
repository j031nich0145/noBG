import { useEffect, useState } from 'react'
import './InfoModal.css'

function InfoModal({ isOpen, onClose }) {
  const [content, setContent] = useState('')
  const [toc, setToc] = useState([])
  const [expandedSections, setExpandedSections] = useState({
    'single-mode': false,
    'batch-mode': false
  })

  // Helper function to slugify text for IDs
  const slugify = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
  }

  // Extract headings from markdown content
  const extractHeadings = (text) => {
    if (!text) return []
    
    const lines = text.split('\n')
    const headings = []
    
    lines.forEach((line, index) => {
      if (line.startsWith('# ')) {
        const title = line.substring(2).trim()
        headings.push({ level: 1, title, id: slugify(title), index })
      } else if (line.startsWith('## ')) {
        const title = line.substring(3).trim()
        headings.push({ level: 2, title, id: slugify(title), index })
      } else if (line.startsWith('### ')) {
        const title = line.substring(4).trim()
        headings.push({ level: 3, title, id: slugify(title), index })
      } else if (line.startsWith('#### ')) {
        const title = line.substring(5).trim()
        headings.push({ level: 4, title, id: slugify(title), index })
      }
    })
    
    return headings
  }

  useEffect(() => {
    if (isOpen) {
      if (!content) {
        // Try to import markdown as raw text (Vite supports ?raw)
        import('../docs/APP_USAGE_GUIDE.md?raw')
          .then(m => {
            const markdownContent = m.default
            setContent(markdownContent)
            setToc(extractHeadings(markdownContent))
          })
          .catch(err => {
            console.error('Failed to load usage guide:', err)
            setContent('# Usage Guide\n\nFailed to load content. Please refresh the page.')
            setToc([])
          })
      } else {
        // Extract TOC if content already loaded
        setToc(extractHeadings(content))
      }
    }
  }, [isOpen, content])

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Handle smooth scroll to section
  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      const contentContainer = element.closest('.info-modal-content')
      if (contentContainer) {
        const elementTop = element.offsetTop - contentContainer.offsetTop - 20
        contentContainer.scrollTo({
          top: elementTop,
          behavior: 'smooth'
        })
      } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  // Render table of contents
  const renderTOC = () => {
    if (toc.length === 0) return null

    // Simplified TOC structure for noBG
    const simplifiedTOC = [
      { id: 'introduction', title: 'Introduction', level: 2 },
      { 
        id: 'single-mode', 
        title: 'Single Mode', 
        level: 2, 
        expandable: true,
        children: [
          { id: 'uploading-images', title: 'Uploading Images', level: 3 },
          { 
            id: 'removal-controls', 
            title: 'Removal Controls', 
            level: 3,
            children: [
              { id: 'threshold-slider', title: 'Threshold Slider', level: 4 },
              { id: 'removal-methods', title: 'Removal Methods', level: 4 },
              { id: 'edge-feather', title: 'Edge Feather', level: 4 },
              { id: 'live-update-toggle', title: 'Live Update Toggle', level: 4 }
            ]
          },
          { id: 'crop-tool', title: 'Crop Tool', level: 3 },
          { id: 'download', title: 'Download', level: 3 }
        ]
      },
      { 
        id: 'batch-mode', 
        title: 'Batch Mode', 
        level: 2, 
        expandable: true,
        children: [
          { id: 'understanding-the-target-image', title: 'Understanding the Target Image', level: 3 },
          { id: 'adding-batch-images', title: 'Adding Batch Images', level: 3 },
          { id: 'batch-operations', title: 'Batch Operations', level: 3 },
          { id: 'batch-download', title: 'Batch Download', level: 3 }
        ]
      },
      { id: 'settings--preferences', title: 'Settings & Preferences', level: 2 },
      { id: 'keyboard-shortcuts', title: 'Keyboard Shortcuts', level: 2 },
      { id: 'tips--best-practices', title: 'Tips & Best Practices', level: 2 }
    ]

    return (
      <div className="info-toc">
        <h3 className="info-toc-title">Table of Contents</h3>
        <ul className="info-toc-list">
          {simplifiedTOC.map((item, index) => {
            const isExpanded = expandedSections[item.id] || false
            
            return (
              <li 
                key={`toc-${index}`} 
                className={`info-toc-item info-toc-level-${item.level}`}
              >
                {item.expandable ? (
                  <>
                    <div className="info-toc-expandable-wrapper">
                      <button
                        className="info-toc-expand-button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSection(item.id)
                        }}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <span className="info-toc-expand-icon">{isExpanded ? '▼' : '▶'}</span>
                      </button>
                      <a
                        href={`#${item.id}`}
                        onClick={(e) => {
                          e.preventDefault()
                          scrollToSection(item.id)
                        }}
                        className="info-toc-link"
                      >
                        {item.title}
                      </a>
                    </div>
                    {isExpanded && item.children && (
                      <ul className="info-toc-sublist">
                        {item.children.map((child, childIndex) => (
                          <li 
                            key={`toc-child-${childIndex}`} 
                            className="info-toc-item info-toc-level-3"
                          >
                            <a
                              href={`#${child.id}`}
                              onClick={(e) => {
                                e.preventDefault()
                                scrollToSection(child.id)
                              }}
                              className="info-toc-link"
                            >
                              {child.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      scrollToSection(item.id)
                    }}
                    className="info-toc-link"
                  >
                    {item.title}
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  // Convert markdown to HTML-like structure
  const renderMarkdown = (text) => {
    if (!text) return null

    const lines = text.split('\n')
    const elements = []
    let currentList = []
    let inCodeBlock = false
    let codeBlockContent = []
    let hasRenderedFirstH1 = false

    lines.forEach((line, index) => {
      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`} className="info-code-block">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          )
          codeBlockContent = []
          inCodeBlock = false
        } else {
          inCodeBlock = true
        }
        return
      }

      if (inCodeBlock) {
        codeBlockContent.push(line)
        return
      }

      // Handle horizontal rules
      if (line.trim() === '---') {
        if (currentList.length > 0) {
          elements.push(<ul key={`list-${index}`}>{currentList}</ul>)
          currentList = []
        }
        elements.push(<hr key={`hr-${index}`} className="info-hr" />)
        return
      }

      // Handle headers
      if (line.startsWith('# ')) {
        if (currentList.length > 0) {
          elements.push(<ul key={`list-${index}`}>{currentList}</ul>)
          currentList = []
        }
        const title = line.substring(2).trim()
        const id = slugify(title)
        elements.push(<h1 key={`h1-${index}`} id={id} className="info-h1">{title}</h1>)
        if (!hasRenderedFirstH1) {
          const tocElement = renderTOC()
          if (tocElement) {
            elements.push(<div key="toc-wrapper">{tocElement}</div>)
          }
          hasRenderedFirstH1 = true
        }
        return
      }
      if (line.startsWith('## ')) {
        if (currentList.length > 0) {
          elements.push(<ul key={`list-${index}`}>{currentList}</ul>)
          currentList = []
        }
        const title = line.substring(3).trim()
        const id = slugify(title)
        elements.push(<h2 key={`h2-${index}`} id={id} className="info-h2">{title}</h2>)
        return
      }
      if (line.startsWith('### ')) {
        if (currentList.length > 0) {
          elements.push(<ul key={`list-${index}`}>{currentList}</ul>)
          currentList = []
        }
        const title = line.substring(4).trim()
        const id = slugify(title)
        elements.push(<h3 key={`h3-${index}`} id={id} className="info-h3">{title}</h3>)
        return
      }
      if (line.startsWith('#### ')) {
        if (currentList.length > 0) {
          elements.push(<ul key={`list-${index}`}>{currentList}</ul>)
          currentList = []
        }
        const title = line.substring(5).trim()
        const id = slugify(title)
        elements.push(<h4 key={`h4-${index}`} id={id} className="info-h4">{title}</h4>)
        return
      }

      // Handle list items
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const listText = line.trim().substring(2)
        const processedText = listText.split('**').map((part, i) => 
          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        )
        currentList.push(<li key={`li-${index}`}>{processedText}</li>)
        return
      }

      // Handle numbered lists
      if (/^\d+\.\s/.test(line.trim())) {
        const listText = line.trim().replace(/^\d+\.\s/, '')
        const processedText = listText.split('**').map((part, i) => 
          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        )
        currentList.push(<li key={`li-${index}`}>{processedText}</li>)
        return
      }

      // Handle regular paragraphs
      if (line.trim()) {
        if (currentList.length > 0) {
          elements.push(<ul key={`list-${index}`}>{currentList}</ul>)
          currentList = []
        }
        let processedLine = line
        if (line.includes('Last Updated: 2024') || line.includes('*Last Updated: 2024*')) {
          processedLine = 'Copyright © 2026 j031nich0145 and agents. All rights reserved.'
        }
        const processedText = processedLine.split('**').map((part, i) => 
          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        )
        elements.push(<p key={`p-${index}`} className="info-p">{processedText}</p>)
      } else {
        if (currentList.length > 0) {
          elements.push(<ul key={`list-${index}`}>{currentList}</ul>)
          currentList = []
        }
      }
    })

    if (currentList.length > 0) {
      elements.push(<ul key="list-final">{currentList}</ul>)
    }

    return elements
  }

  if (!isOpen) return null

  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="info-modal-close" onClick={onClose} title="Close">
          ×
        </button>
        <div className="info-modal-content">
          {content && renderMarkdown(content)}
        </div>
      </div>
    </div>
  )
}

export default InfoModal

