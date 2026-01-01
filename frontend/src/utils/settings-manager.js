/**
 * Settings Manager - Sync settings between Single and Batch modes
 */

const SETTINGS_KEY = 'nobg_settings'

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      threshold: settings.threshold,
      removalMethod: settings.removalMethod,
      edgeFeather: settings.edgeFeather,
      backgroundColor: settings.backgroundColor,
      liveUpdate: settings.liveUpdate,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

export function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
  return null
}

export function getDefaultSettings() {
  return {
    threshold: 50,
    removalMethod: 'edge-detect',
    edgeFeather: 2,
    backgroundColor: '#ffffff',
    liveUpdate: true
  }
}

export function getSettings() {
  const saved = loadSettings()
  return saved || getDefaultSettings()
}

