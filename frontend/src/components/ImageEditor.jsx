import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Crop, SlidersHorizontal, Sparkles, RotateCcw, ZoomIn, ZoomOut, Move } from 'lucide-react';

const FILTERS = [
  { name: 'None', css: '', icon: '🔲' },
  { name: 'Vivid', css: 'saturate(1.4) contrast(1.1)', icon: '🌈' },
  { name: 'Warm', css: 'sepia(0.25) saturate(1.3) brightness(1.05)', icon: '☀️' },
  { name: 'Cool', css: 'saturate(0.9) hue-rotate(15deg) brightness(1.05)', icon: '❄️' },
  { name: 'B&W', css: 'grayscale(1)', icon: '⬛' },
  { name: 'Vintage', css: 'sepia(0.4) contrast(0.9) brightness(1.1)', icon: '📷' },
  { name: 'Fade', css: 'contrast(0.85) brightness(1.15) saturate(0.8)', icon: '🌫️' },
  { name: 'Drama', css: 'contrast(1.4) brightness(0.9) saturate(1.2)', icon: '🎭' },
  { name: 'Glow', css: 'brightness(1.2) contrast(0.95) saturate(1.1)', icon: '✨' },
  { name: 'Noir', css: 'grayscale(0.8) contrast(1.3) brightness(0.9)', icon: '🖤' },
];

const ASPECT_RATIOS = [
  { label: 'Free', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
];

const ImageEditor = ({ imageFile, onSave, onCancel, aspectRatioLock = null }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [activeTab, setActiveTab] = useState('crop');

  // Crop state
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 100, h: 100 }); // percentages
  const [aspectRatio, setAspectRatio] = useState(aspectRatioLock);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); // 'move' | 'nw' | 'ne' | 'sw' | 'se'
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Adjustments
  const [adjustments, setAdjustments] = useState({ brightness: 100, contrast: 100, saturation: 100 });

  // Filter
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);

  const previewRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      const img = new Image();
      img.onload = () => {
        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        if (aspectRatioLock) {
          applyCropAspectRatio(aspectRatioLock, 100, 100);
        }
      };
      img.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const applyCropAspectRatio = (ratio, containerW = cropBox.w, containerH = cropBox.h) => {
    if (!ratio) { setCropBox({ x: 0, y: 0, w: 100, h: 100 }); return; }
    const imgAspect = naturalSize.w / naturalSize.h || 1;
    const cropAspect = ratio;
    let w, h;
    if (cropAspect > imgAspect) {
      w = 100; h = (100 * imgAspect) / cropAspect;
    } else {
      h = 100; w = (100 * cropAspect) / imgAspect;
    }
    setCropBox({ x: (100 - w) / 2, y: (100 - h) / 2, w, h });
  };

  const handleAspectChange = (ratio) => {
    setAspectRatio(ratio);
    if (ratio) applyCropAspectRatio(ratio);
    else setCropBox({ x: 0, y: 0, w: 100, h: 100 });
  };

  const getFilterCSS = () => {
    const adj = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
    return selectedFilter.css ? `${adj} ${selectedFilter.css}` : adj;
  };

  const handleCropMouseDown = (e, type) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(true); setDragType(type);
    const rect = previewRef.current?.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - rect.left, y: clientY - rect.top, box: { ...cropBox } });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const px = ((clientX - rect.left) / rect.width) * 100;
    const py = ((clientY - rect.top) / rect.height) * 100;
    const spx = (dragStart.x / rect.width) * 100;
    const spy = (dragStart.y / rect.height) * 100;
    const dx = px - spx, dy = py - spy;
    const b = dragStart.box;

    if (dragType === 'move') {
      let nx = Math.max(0, Math.min(100 - b.w, b.x + dx));
      let ny = Math.max(0, Math.min(100 - b.h, b.y + dy));
      setCropBox(prev => ({ ...prev, x: nx, y: ny }));
    } else {
      let nx = b.x, ny = b.y, nw = b.w, nh = b.h;
      if (dragType.includes('w')) { nx = Math.max(0, b.x + dx); nw = b.w - dx; }
      if (dragType.includes('e')) { nw = b.w + dx; }
      if (dragType.includes('n')) { ny = Math.max(0, b.y + dy); nh = b.h - dy; }
      if (dragType.includes('s')) { nh = b.h + dy; }
      nw = Math.max(10, Math.min(100 - nx, nw));
      nh = Math.max(10, Math.min(100 - ny, nh));
      if (aspectRatio) {
        const imgAspect = naturalSize.w / naturalSize.h || 1;
        nh = (nw * imgAspect) / aspectRatio;
        if (ny + nh > 100) { nh = 100 - ny; nw = (nh * aspectRatio) / imgAspect; }
      }
      setCropBox({ x: nx, y: ny, w: nw, h: nh });
    }
  }, [isDragging, dragType, dragStart, aspectRatio, naturalSize]);

  const handleMouseUp = useCallback(() => { setIsDragging(false); setDragType(null); }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const resetAll = () => {
    setCropBox({ x: 0, y: 0, w: 100, h: 100 });
    setAdjustments({ brightness: 100, contrast: 100, saturation: 100 });
    setSelectedFilter(FILTERS[0]);
    setAspectRatio(aspectRatioLock);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || naturalSize.w === 0) {
      console.error('Editor not ready or image not loaded');
      return;
    }

    const sx = (cropBox.x / 100) * naturalSize.w;
    const sy = (cropBox.y / 100) * naturalSize.h;
    const sw = (cropBox.w / 100) * naturalSize.w;
    const sh = (cropBox.h / 100) * naturalSize.h;

    if (sw <= 0 || sh <= 0 || isNaN(sw) || isNaN(sh)) {
      console.error('Invalid crop dimensions');
      return;
    }

    let exportWidth = Math.round(sw);
    let exportHeight = Math.round(sh);

    // Limit max resolution to 1920px to prevent mobile browser canvas out-of-memory errors
    const MAX_DIM = 1920;
    if (exportWidth > MAX_DIM || exportHeight > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / exportWidth, MAX_DIM / exportHeight);
      exportWidth = Math.round(exportWidth * ratio);
      exportHeight = Math.round(exportHeight * ratio);
    }

    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d');
    ctx.filter = getFilterCSS().replace(/%/g, '%');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, exportWidth, exportHeight);

    canvas.toBlob((blob) => {
      if (blob) {
        let editedFile;
        try {
          editedFile = new File([blob], imageFile?.name || 'edited.jpg', { type: 'image/jpeg' });
        } catch (e) {
          // Fallback for older browsers (e.g., old iOS Safari)
          editedFile = blob;
          editedFile.name = imageFile?.name || 'edited.jpg';
        }
        onSave(editedFile);
      } else {
        console.error('Canvas toBlob failed');
        onSave(imageFile); // Fallback to original image if blob fails
      }
    }, 'image/jpeg', 0.92);
  };

  const tabs = [
    { id: 'crop', icon: Crop, label: 'Crop' },
    { id: 'adjust', icon: SlidersHorizontal, label: 'Adjust' },
    { id: 'filter', icon: Sparkles, label: 'Filters' },
  ];

  return (
    <div className="fixed inset-0 z-[3000] bg-[#0D0D12] flex flex-col animate-fade-in">
      {/* Hidden elements */}
      <canvas ref={canvasRef} className="hidden" />
      <img ref={imgRef} src={imageUrl} alt="" className="hidden" />

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-dark-900/80 backdrop-blur-xl border-b border-white/5 relative z-20">
        <button onClick={onCancel} className="flex items-center gap-2 text-white/70 hover:text-white transition px-3 py-2 rounded-xl hover:bg-white/5">
          <X className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Cancel</span>
        </button>
        <h2 className="text-white font-bold text-sm tracking-wide">Edit Photo</h2>
        <div className="flex items-center gap-2">
          <button onClick={resetAll} className="p-2 text-white/50 hover:text-white transition rounded-lg hover:bg-white/5" title="Reset">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 bg-gradient-to-r from-[#5C67FF] to-[#8B5CF6] px-5 py-2 rounded-full text-white text-sm font-bold shadow-lg shadow-[#5C67FF]/30 active:scale-95 transition-transform">
            <Check className="w-4 h-4" /> Done
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden relative">
        {/* Blurred background */}
        {imageUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-125 z-0"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        )}
        <div ref={previewRef} className="relative max-w-full max-h-full inline-block z-10" style={{ touchAction: 'none' }}>
          <img
            src={imageUrl}
            alt="Preview"
            className="max-w-full max-h-[55vh] sm:max-h-[60vh] object-contain rounded-lg select-none shadow-2xl"
            style={{ filter: getFilterCSS() }}
            draggable={false}
          />
          {/* Crop Overlay */}
          {activeTab === 'crop' && (
            <>
              {/* Dimmed regions */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bg-black/60" style={{ top: 0, left: 0, right: 0, height: `${cropBox.y}%` }} />
                <div className="absolute bg-black/60" style={{ bottom: 0, left: 0, right: 0, height: `${100 - cropBox.y - cropBox.h}%` }} />
                <div className="absolute bg-black/60" style={{ top: `${cropBox.y}%`, left: 0, width: `${cropBox.x}%`, height: `${cropBox.h}%` }} />
                <div className="absolute bg-black/60" style={{ top: `${cropBox.y}%`, right: 0, width: `${100 - cropBox.x - cropBox.w}%`, height: `${cropBox.h}%` }} />
              </div>
              {/* Crop Box */}
              <div
                className="absolute border-2 border-white/90 cursor-move"
                style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.w}%`, height: `${cropBox.h}%` }}
                onMouseDown={(e) => handleCropMouseDown(e, 'move')}
                onTouchStart={(e) => handleCropMouseDown(e, 'move')}
              >
                {/* Grid lines */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                  <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                </div>
                {/* Corner handles */}
                {['nw', 'ne', 'sw', 'se'].map(corner => (
                  <div
                    key={corner}
                    className="absolute w-5 h-5 z-10"
                    style={{
                      top: corner.includes('n') ? -3 : 'auto',
                      bottom: corner.includes('s') ? -3 : 'auto',
                      left: corner.includes('w') ? -3 : 'auto',
                      right: corner.includes('e') ? -3 : 'auto',
                      cursor: `${corner}-resize`,
                    }}
                    onMouseDown={(e) => handleCropMouseDown(e, corner)}
                    onTouchStart={(e) => handleCropMouseDown(e, corner)}
                  >
                    <div className="absolute bg-white rounded-sm" style={{
                      width: 16, height: 3,
                      top: corner.includes('n') ? 0 : 'auto',
                      bottom: corner.includes('s') ? 0 : 'auto',
                      left: corner.includes('w') ? 0 : 'auto',
                      right: corner.includes('e') ? 0 : 'auto',
                    }} />
                    <div className="absolute bg-white rounded-sm" style={{
                      width: 3, height: 16,
                      top: corner.includes('n') ? 0 : 'auto',
                      bottom: corner.includes('s') ? 0 : 'auto',
                      left: corner.includes('w') ? 0 : 'auto',
                      right: corner.includes('e') ? 0 : 'auto',
                    }} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="bg-[#0D0D12] border-t border-white/5">
        {/* Tab buttons */}
        <div className="flex justify-center gap-1 px-4 py-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#5C67FF] text-white shadow-lg shadow-[#5C67FF]/30'
                  : 'bg-white/8 text-white/60 hover:text-white hover:bg-white/12'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Crop Panel */}
        {activeTab === 'crop' && (
          <div className="px-4 pb-4 pt-2 animate-fade-in">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2 font-semibold">Aspect Ratio</p>
            <div className="flex gap-2 flex-wrap">
              {ASPECT_RATIOS.map(ar => (
                <button
                  key={ar.label}
                  onClick={() => handleAspectChange(ar.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                    (aspectRatio === ar.value || (!aspectRatio && !ar.value))
                      ? 'bg-[#5C67FF] text-white'
                      : 'bg-white/8 text-white/60 hover:bg-white/15'
                  }`}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Adjust Panel */}
        {activeTab === 'adjust' && (
          <div className="px-4 pb-4 pt-2 space-y-4 animate-fade-in">
            {[
              { key: 'brightness', label: 'Brightness', icon: '☀️', min: 50, max: 150 },
              { key: 'contrast', label: 'Contrast', icon: '◑', min: 50, max: 150 },
              { key: 'saturation', label: 'Saturation', icon: '🎨', min: 0, max: 200 },
            ].map(adj => (
              <div key={adj.key} className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">{adj.icon}</span>
                <span className="text-white/50 text-xs w-20 font-medium">{adj.label}</span>
                <input
                  type="range"
                  min={adj.min}
                  max={adj.max}
                  value={adjustments[adj.key]}
                  onChange={(e) => setAdjustments(prev => ({ ...prev, [adj.key]: Number(e.target.value) }))}
                  className="flex-1 accent-[#5C67FF] h-1"
                />
                <span className="text-white/40 text-xs w-8 text-right font-mono">{adjustments[adj.key]}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Filter Panel */}
        {activeTab === 'filter' && (
          <div className="px-4 pb-4 pt-2 animate-fade-in">
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {FILTERS.map(f => (
                <button
                  key={f.name}
                  onClick={() => setSelectedFilter(f)}
                  className={`flex flex-col items-center gap-1.5 flex-shrink-0 transition-all ${
                    selectedFilter.name === f.name ? 'scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedFilter.name === f.name ? 'border-[#5C67FF] shadow-lg shadow-[#5C67FF]/30' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={imageUrl}
                      alt={f.name}
                      className="w-full h-full object-cover"
                      style={{ filter: f.css || 'none' }}
                      draggable={false}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold ${selectedFilter.name === f.name ? 'text-[#5C67FF]' : 'text-white/50'}`}>
                    {f.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageEditor;
