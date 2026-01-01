# noBG - Background Removal Tool

## Introduction

noBG is a powerful client-side background removal tool that works entirely in your browser. No uploads to external servers required - your images stay private on your device.

## Single Mode

### Uploading Images

1. **Drag and Drop**: Simply drag an image file onto the upload area
2. **Click to Browse**: Click the upload area or "Browse Files" button to select an image
3. **Supported Formats**: JPG and PNG files up to 10MB

### Removal Controls

#### Threshold Slider

The threshold slider controls how aggressively the background is removed:
- **Lower values (0-30)**: More conservative, keeps more of the original image
- **Medium values (30-70)**: Balanced removal for most images
- **Higher values (70-100)**: More aggressive, removes more background

Use the < and > buttons for precise 1% adjustments.

#### Removal Methods

- **Edge Detect**: Uses edge detection and flood fill from image corners. Best for images with distinct foreground/background separation.
- **Color Key**: Removes a specific background color (like green screen). Best for solid color backgrounds.
- **Luminance**: Removes based on brightness. Best for removing white or very bright backgrounds.

#### Edge Feather

Controls the softness of edges after removal:
- **0**: Sharp, hard edges
- **1-3**: Slight softening (recommended)
- **4-10**: Very soft, blurred edges

#### Live Update Toggle

When enabled, the preview updates automatically as you adjust settings. Disable for manual control with the Process button.

### Crop Tool

Access crop options to trim your image before or after background removal:
- **1:1**: Square crop
- **3:2**: Photo aspect ratio
- **4:3**: Traditional aspect ratio

### Download

Click the download button (⬇️) to save your processed image as a PNG with transparency.

## Batch Mode

### Understanding the Target Image

The target image is your reference image from Single Mode. All batch images will be processed with the same settings.

### Adding Batch Images

1. Click the upload button (⬆️) to add multiple images
2. Maximum of 48 images per batch
3. Only JPG and PNG files are supported

### Batch Operations

- **Remove BG All**: Process all images with current settings
- **Batch Crop**: Apply the same crop to all images
- **Batch Refine**: Apply edge refinement to all images
- **Clear Batch**: Remove all batch images

### Batch Download

After processing, click the download button to get a ZIP file containing all processed images with transparent backgrounds.

## Settings & Preferences

- **Dark Mode**: Toggle between light and dark themes using the 🌙/☀️ button
- Settings are automatically saved and restored between sessions

## Keyboard Shortcuts

- **Ctrl/Cmd + Z**: Undo last action
- **Enter**: Apply crop (when crop modal is open)
- **Escape**: Cancel/close modals
- **Arrow Keys**: Nudge crop position
- **+/-**: Adjust crop size

## Tips & Best Practices

1. **Start with Edge Detect**: It works best for most photos
2. **Use Color Key for solid backgrounds**: Green screens, white backgrounds, etc.
3. **Adjust threshold gradually**: Start at 50% and fine-tune
4. **Enable Live Update**: See changes in real-time
5. **Use Edge Feather**: Adds natural-looking edges (1-2 recommended)
6. **Crop first**: Remove unwanted areas before processing

---

*Last Updated: 2024*

