"""
noBG Backend - Flask API for background removal
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import numpy as np
import cv2
import io
import os

app = Flask(__name__)
CORS(app)

# Maximum file size (16MB)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024


def remove_background_edge_detect(image, threshold=50):
    """
    Remove background using edge detection and flood fill.
    
    Args:
        image: PIL Image object
        threshold: Sensitivity threshold (0-100)
    
    Returns:
        PIL Image with transparent background
    """
    # Convert PIL to numpy array
    img_array = np.array(image.convert('RGB'))
    
    # Convert to BGR for OpenCV
    img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    
    # Convert to grayscale
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Use Canny edge detection
    # Map threshold (0-100) to Canny thresholds
    low_thresh = int(threshold * 0.5)
    high_thresh = int(threshold * 1.5)
    edges = cv2.Canny(blurred, low_thresh, high_thresh)
    
    # Dilate edges to close gaps
    kernel = np.ones((3, 3), np.uint8)
    dilated = cv2.dilate(edges, kernel, iterations=2)
    
    # Find contours
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Create mask
    mask = np.zeros(gray.shape, dtype=np.uint8)
    
    if contours:
        # Fill all contours
        cv2.drawContours(mask, contours, -1, 255, -1)
        
        # Apply morphological operations to clean up
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    
    # If mask is mostly empty, use GrabCut as fallback
    if np.sum(mask) < (mask.size * 0.01):  # Less than 1% of image
        # Use GrabCut
        mask = np.zeros(img_bgr.shape[:2], np.uint8)
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)
        
        # Define rectangle for GrabCut (slightly inset from edges)
        h, w = img_bgr.shape[:2]
        margin = int(min(h, w) * 0.05)
        rect = (margin, margin, w - 2*margin, h - 2*margin)
        
        try:
            cv2.grabCut(img_bgr, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
            mask = np.where((mask == 2) | (mask == 0), 0, 255).astype('uint8')
        except:
            # If GrabCut fails, create a simple centered mask
            mask = np.zeros(gray.shape, dtype=np.uint8)
            h, w = mask.shape
            cv2.ellipse(mask, (w//2, h//2), (w//3, h//3), 0, 0, 360, 255, -1)
    
    # Create RGBA image
    rgba = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGBA)
    rgba[:, :, 3] = mask
    
    # Convert back to PIL
    result = Image.fromarray(rgba)
    return result


def remove_background_color_key(image, threshold=50):
    """
    Remove background using color keying (chroma key style).
    Detects the dominant corner color and removes similar colors.
    
    Args:
        image: PIL Image object
        threshold: Color similarity threshold (0-100)
    
    Returns:
        PIL Image with transparent background
    """
    # Convert to numpy array
    img_array = np.array(image.convert('RGB'))
    
    # Sample corner colors to detect background
    h, w = img_array.shape[:2]
    corners = [
        img_array[0, 0],           # Top-left
        img_array[0, w-1],         # Top-right
        img_array[h-1, 0],         # Bottom-left
        img_array[h-1, w-1]        # Bottom-right
    ]
    
    # Use median of corners as background color
    bg_color = np.median(corners, axis=0).astype(np.uint8)
    
    # Calculate color difference from background
    diff = np.sqrt(np.sum((img_array.astype(np.float32) - bg_color.astype(np.float32)) ** 2, axis=2))
    
    # Map threshold (0-100) to actual distance threshold
    # Higher threshold = more aggressive removal
    dist_threshold = (100 - threshold) * 2.55 + 10  # Range: 10-265
    
    # Create mask where foreground is white
    mask = (diff > dist_threshold).astype(np.uint8) * 255
    
    # Clean up mask with morphological operations
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    
    # Create RGBA image
    rgba = np.dstack([img_array, mask])
    
    result = Image.fromarray(rgba)
    return result


def remove_background_luminance(image, threshold=50):
    """
    Remove background based on luminance/brightness.
    Good for images with light backgrounds.
    
    Args:
        image: PIL Image object
        threshold: Brightness threshold (0-100)
    
    Returns:
        PIL Image with transparent background
    """
    # Convert to numpy array
    img_array = np.array(image.convert('RGB'))
    
    # Convert to grayscale for luminance
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # Map threshold (0-100) to actual luminance threshold
    # Higher threshold = more aggressive (removes more light areas)
    lum_threshold = int(255 - (threshold * 2.55))
    
    # Create mask where darker areas are kept
    mask = (gray < lum_threshold).astype(np.uint8) * 255
    
    # Clean up mask
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    
    # Create RGBA image
    rgba = np.dstack([img_array, mask])
    
    result = Image.fromarray(rgba)
    return result


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'noBG'})


@app.route('/api/remove-background', methods=['POST'])
def remove_background():
    """
    Remove background from uploaded image.
    
    Form data:
        - image: Image file
        - threshold: Removal threshold (0-100, default 50)
        - method: Removal method ('edge-detect', 'color-key', 'luminance')
    
    Returns:
        PNG image with transparent background
    """
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Get parameters
    try:
        threshold = float(request.form.get('threshold', 50))
        threshold = max(0, min(100, threshold))  # Clamp to 0-100
    except (ValueError, TypeError):
        threshold = 50
    
    method = request.form.get('method', 'edge-detect')
    
    try:
        # Load image
        image = Image.open(file.stream)
        
        # Convert to RGB if necessary (handle RGBA, palette, etc.)
        if image.mode not in ('RGB', 'RGBA'):
            image = image.convert('RGB')
        
        # Apply background removal based on method
        if method == 'color-key':
            result = remove_background_color_key(image, threshold)
        elif method == 'luminance':
            result = remove_background_luminance(image, threshold)
        else:  # Default to edge-detect
            result = remove_background_edge_detect(image, threshold)
        
        # Save to bytes buffer
        buffer = io.BytesIO()
        result.save(buffer, format='PNG')
        buffer.seek(0)
        
        return send_file(
            buffer,
            mimetype='image/png',
            as_attachment=False
        )
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/batch-remove-background', methods=['POST'])
def batch_remove_background():
    """
    Remove background from multiple images.
    
    Form data:
        - images[]: Array of image files
        - threshold: Removal threshold (0-100, default 50)
        - method: Removal method
    
    Returns:
        JSON with processed image data (base64)
    """
    if 'images[]' not in request.files:
        return jsonify({'error': 'No image files provided'}), 400
    
    files = request.files.getlist('images[]')
    if not files:
        return jsonify({'error': 'No files selected'}), 400
    
    # Get parameters
    try:
        threshold = float(request.form.get('threshold', 50))
        threshold = max(0, min(100, threshold))
    except (ValueError, TypeError):
        threshold = 50
    
    method = request.form.get('method', 'edge-detect')
    
    results = []
    for i, file in enumerate(files):
        try:
            image = Image.open(file.stream)
            
            if image.mode not in ('RGB', 'RGBA'):
                image = image.convert('RGB')
            
            if method == 'color-key':
                result = remove_background_color_key(image, threshold)
            elif method == 'luminance':
                result = remove_background_luminance(image, threshold)
            else:
                result = remove_background_edge_detect(image, threshold)
            
            # Convert to base64
            buffer = io.BytesIO()
            result.save(buffer, format='PNG')
            buffer.seek(0)
            
            import base64
            img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            results.append({
                'index': i,
                'filename': file.filename,
                'status': 'success',
                'data': f'data:image/png;base64,{img_base64}'
            })
        
        except Exception as e:
            results.append({
                'index': i,
                'filename': file.filename,
                'status': 'error',
                'error': str(e)
            })
    
    return jsonify({'results': results})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)

