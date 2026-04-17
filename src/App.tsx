import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Upload, 
  RotateCcw, 
  Zap, 
  Loader2, 
  Trash2, 
  History,
  Info,
  ChevronLeft,
  Search,
  Grid3X3
} from 'lucide-react';
import { solveSudoku, isValidInitialGrid, SudokuGrid } from './lib/sudoku';
import { recognizeSudokuGrid } from './services/gemini';

type AppState = 'IDLE' | 'SCANNING' | 'PROCESSING' | 'REVIEW' | 'SOLVING' | 'SOLVED';

export default function App() {
  const [state, setState] = useState<AppState>('IDLE');
  const [grid, setGrid] = useState<SudokuGrid>(Array(9).fill(0).map(() => Array(9).fill(0)));
  const [initialGrid, setInitialGrid] = useState<SudokuGrid>(Array(9).fill(0).map(() => Array(9).fill(0)));
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(newStream);
      setState('SCANNING');
      setError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please check permissions or try uploading an image.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setImagePreview(dataUrl);
    stopCamera();
    processImage(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      processImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64: string) => {
    setState('PROCESSING');
    setError(null);
    try {
      const recognizedGrid = await recognizeSudokuGrid(base64);
      setGrid(recognizedGrid);
      setInitialGrid(recognizedGrid.map(row => [...row]));
      setState('REVIEW');
    } catch (err) {
      setError("Failed to recognize Sudoku grid. Make sure the puzzle is clearly visible and fills most of the frame.");
      setState('IDLE');
    }
  };

  const handleCellChange = (row: number, col: number, value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 0 || num > 9) {
      const newGrid = grid.map(r => [...r]);
      newGrid[row][col] = 0;
      setGrid(newGrid);
    } else {
      const newGrid = grid.map(r => [...r]);
      newGrid[row][col] = num;
      setGrid(newGrid);
    }
  };

  const handleSolve = () => {
    if (!isValidInitialGrid(grid)) {
      setError("The current grid is invalid. Please check for duplicate numbers in rows, columns, or 3x3 boxes.");
      return;
    }

    setState('SOLVING');
    setError(null);
    
    // Artificial small delay for UX satisfaction
    setTimeout(() => {
      const solved = solveSudoku(grid);
      if (solved) {
        setGrid(solved);
        setState('SOLVED');
      } else {
        setError("This Sudoku puzzle has no solution.");
        setState('REVIEW');
      }
    }, 600);
  };

  const reset = () => {
    setState('IDLE');
    setGrid(Array(9).fill(0).map(() => Array(9).fill(0)));
    setInitialGrid(Array(9).fill(0).map(() => Array(9).fill(0)));
    setImagePreview(null);
    setError(null);
    stopCamera();
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row bg-bg text-ink-primary overflow-hidden">
      {/* Mobile Header */}
      <header className="lg:hidden h-16 bg-card border-b border-line flex items-center justify-between px-6 z-50 shrink-0">
        <div className="font-bold text-lg tracking-tighter flex items-center gap-2">
          <div className="w-6 h-6 bg-accent rounded flex items-center justify-center shrink-0">
            <Grid3X3 className="text-white w-4 h-4" />
          </div>
          SudokuLens
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 -mr-2 bg-line rounded-lg"
        >
          {isMobileMenuOpen ? <Trash2 className="w-5 h-5" /> : <Info className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside className={`
        ${isMobileMenuOpen ? 'flex' : 'hidden'} 
        lg:flex lg:w-[320px] bg-card border-r border-line flex-col p-8 lg:p-10 z-[60] shrink-0
        absolute inset-0 lg:relative
      `}>
        <div className="font-bold text-xl tracking-tighter mb-12 hidden lg:flex items-center gap-2">
          <div className="w-6 h-6 bg-accent rounded flex items-center justify-center shrink-0">
            <Grid3X3 className="text-white w-4 h-4" />
          </div>
          SudokuLens
        </div>

        {isMobileMenuOpen && (
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-6 right-6 p-2 bg-line rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="mb-8">
            <span className="text-[11px] uppercase tracking-wider text-ink-secondary mb-3 block font-semibold">
              Scan Options
            </span>
            <div className="space-y-3">
              <button 
                onClick={() => { startCamera(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-line hover:bg-bg transition-colors text-sm font-medium"
              >
                <Camera className="w-4 h-4 text-accent" />
                Open Camera
              </button>
              <label className="w-full flex items-center gap-3 p-3 rounded-xl border border-line hover:bg-bg transition-colors text-sm font-medium cursor-pointer">
                <Upload className="w-4 h-4 text-accent" />
                Upload Image
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => { handleFileUpload(e); setIsMobileMenuOpen(false); }}
                  ref={fileInputRef}
                />
              </label>
            </div>
          </div>

          <div className="mb-8">
            <span className="text-[11px] uppercase tracking-wider text-ink-secondary mb-3 block font-semibold">
              Recent Solves
            </span>
            <div className="space-y-3">
              <div className="p-4 border border-line rounded-xl flex items-center gap-4 bg-bg/30">
                <div className="w-10 h-10 bg-line rounded-lg flex items-center justify-center">
                  <History className="w-5 h-5 text-ink-secondary" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold">Captured Puzzle</div>
                  <div className="text-[11px] text-ink-secondary">Recently detected</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex gap-3 pt-6 border-t border-line">
          <button 
            onClick={() => { reset(); setIsMobileMenuOpen(false); }}
            className="flex-1 py-3 px-4 rounded-xl border border-line bg-bg hover:bg-line transition-colors text-xs font-bold uppercase tracking-wide"
          >
            Reset
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex items-center justify-center p-6 lg:p-10 overflow-auto bg-bg">
        <AnimatePresence mode="wait">
          {state === 'IDLE' && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="text-center max-w-md"
            >
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-card rounded-[24px] lg:rounded-[32px] shadow-sm flex items-center justify-center mx-auto mb-6 lg:mb-8 border border-line">
                <Search className="w-8 h-8 lg:w-10 lg:h-10 text-accent/20" />
              </div>
              <h2 className="text-xl lg:text-2xl font-bold mb-4 tracking-tight">Sudoku Lens</h2>
              <p className="text-ink-secondary mb-8 lg:mb-10 leading-relaxed text-sm">
                Point your camera at a Sudoku puzzle. We'll automatically identify the layout and provide a complete solution in seconds.
              </p>
              <button 
                onClick={startCamera}
                className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-white font-bold py-4 px-10 rounded-2xl transition-all shadow-xl shadow-accent/20 active:scale-95 text-sm"
              >
                Scan New Puzzle
              </button>
            </motion.div>
          )}

          {state === 'SCANNING' && (
            <motion.div 
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-[520px] aspect-square bg-[#E2E4E9] rounded-[32px] lg:rounded-[48px] overflow-hidden shadow-inner relative flex items-center justify-center"
            >
              <video 
                ref={(el) => {
                  if (el && stream) {
                    el.srcObject = stream;
                    el.play().catch(console.error);
                  }
                  // Still keep the ref for capturePhoto
                  (videoRef as any).current = el;
                }} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover bg-black"
              />
              
              {/* Viewfinder */}
              <div className="absolute w-[85%] h-[85%] border-2 border-white/50 rounded-2xl z-10" />
              
              <motion.div 
                animate={{ top: ['20%', '80%', '20%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="scanner-line !left-[7.5%] !right-[7.5%]"
              />

              <div className="absolute inset-x-0 bottom-6 lg:bottom-10 flex justify-center gap-4 px-6 z-20">
                <button 
                  onClick={() => { stopCamera(); setState('IDLE'); }}
                  className="w-10 h-10 lg:w-12 lg:h-12 bg-white shadow-xl rounded-full flex items-center justify-center text-ink-primary"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={capturePhoto}
                  className="w-14 h-14 lg:w-18 lg:h-18 bg-white rounded-full flex items-center justify-center text-accent shadow-2xl ring-4 lg:ring-8 ring-white/20 active:scale-95 transition-transform"
                >
                  <Camera className="w-6 h-6 lg:w-8 lg:h-8" />
                </button>
                <div className="w-10 h-10 lg:w-12 lg:h-12" />
              </div>
            </motion.div>
          )}

          {state === 'PROCESSING' && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="relative w-20 h-20 lg:w-24 lg:h-24 mx-auto mb-6 lg:mb-8">
                <Loader2 className="w-20 h-20 lg:w-24 lg:h-24 text-accent animate-spin stroke-[1.5]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-accent rounded-full animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Analyzing Grid</h3>
              <p className="text-ink-secondary text-sm">Identifying numbers & structure...</p>
            </motion.div>
          )}

          {(state === 'REVIEW' || state === 'SOLVING' || state === 'SOLVED') && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col items-center gap-8 lg:gap-10 w-full"
            >
              <div className="relative group w-full max-w-[460px]">
                <div className="sudoku-grid aspect-square border-4 border-white overflow-hidden">
                  {grid.map((row, rowIndex) => (
                    row.map((cell, colIndex) => {
                      const isInitial = initialGrid[rowIndex][colIndex] !== 0;
                      return (
                        <div key={`${rowIndex}-${colIndex}`} className="sudoku-cell">
                          <input
                            type="number"
                            value={cell === 0 ? '' : cell}
                            readOnly={state === 'SOLVING' || state === 'SOLVED'}
                            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                            className={`
                              w-full h-full text-center text-lg lg:text-xl font-medium focus:outline-none transition-colors rounded-sm
                              ${isInitial ? 'text-ink-secondary' : 'text-accent font-bold'}
                              ${state === 'SOLVED' && !isInitial ? 'bg-accent/5' : ''}
                            `}
                            min="1"
                            max="9"
                            inputMode="numeric"
                          />
                        </div>
                      )
                    })
                  ))}
                </div>

                <div className="md:absolute md:-bottom-14 md:left-1/2 md:-translate-x-1/2 mt-6 md:mt-0 whitespace-nowrap bg-ink-primary text-white py-2.5 px-6 rounded-full text-[13px] font-medium flex items-center gap-3 shadow-2xl mx-auto w-fit">
                  {state === 'SOLVED' ? (
                    <>
                      <div className="w-2 h-2 bg-[#4CAF50] rounded-full animate-pulse" />
                      Puzzle Solved Successfully
                    </>
                  ) : state === 'SOLVING' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Solving In Progress
                    </>
                  ) : (
                    <>
                      <Info className="w-4 h-4 text-accent" />
                      Review Grid before Solving
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm font-medium mt-4 lg:mt-10 px-4 text-center">
                  {error}
                </div>
              )}

              {state === 'REVIEW' && (
                <button 
                  onClick={handleSolve}
                  className="mt-8 lg:mt-12 w-full max-w-xs bg-accent hover:bg-accent/90 text-white font-bold py-4 px-12 rounded-2xl transition-all shadow-xl shadow-accent/20 active:scale-95 text-sm"
                >
                  Confirm & Solve Now
                </button>
              )}
              {state === 'SOLVED' && (
                <button 
                  onClick={reset}
                  className="mt-8 lg:mt-12 w-full max-w-xs bg-white border border-line hover:bg-bg text-ink-primary font-bold py-4 px-12 rounded-2xl transition-all shadow-sm active:scale-95 text-sm"
                >
                  Finish & Reset
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
