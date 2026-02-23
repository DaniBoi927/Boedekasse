import React, { useState, useEffect, useRef, useCallback } from 'react';

type WheelSegment = {
  label: string;
  shortLabel: string;
  color: string;
  multiplier: number;
};

const segments: WheelSegment[] = [
  { label: 'Halver bøde', shortLabel: '½', color: '#22c55e', multiplier: 0.5 },
  { label: 'Dobbelt bøde', shortLabel: '2×', color: '#f59e0b', multiplier: 2 },
  { label: 'Slet bøde', shortLabel: '🎉', color: '#3b82f6', multiplier: 0 },
  { label: 'Tredobbelt', shortLabel: '3×', color: '#dc2626', multiplier: 3 },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onResult: (multiplier: number, label: string) => void;
  fineName: string;
  fineAmount: number;
  fineId: number;
};

export default function LuckyWheel({ isOpen, onClose, onResult, fineName, fineAmount, fineId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<WheelSegment | null>(null);
  const [applied, setApplied] = useState(false);
  const [currentSegmentName, setCurrentSegmentName] = useState('');
  
  const angleRef = useRef(0);
  const spinStartRef = useRef(0);
  const animationRef = useRef<number>(0);
  
  const size = 130; // radius
  const centerX = size + 10;
  const centerY = size + 10;
  const PI2 = Math.PI * 2;

  // Reset state when fineId changes
  useEffect(() => {
    setIsSpinning(false);
    setResult(null);
    setApplied(false);
    setCurrentSegmentName('');
    angleRef.current = 0;
  }, [fineId]);

  const drawWheel = useCallback((angleCurrent: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const len = segments.length;
    let lastAngle = angleCurrent;

    // Draw segments
    for (let i = 0; i < len; i++) {
      const angle = PI2 * ((i + 1) / len) + angleCurrent;
      
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, size, lastAngle, angle, false);
      ctx.lineTo(centerX, centerY);
      ctx.closePath();
      ctx.fillStyle = segments[i].color;
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw label
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((lastAngle + angle) / 2);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(segments[i].shortLabel, size / 2 + 20, 0);
      ctx.restore();

      lastAngle = angle;
    }

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, PI2, false);
    ctx.closePath();
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎾', centerX, centerY);

    // Draw outer ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, size, 0, PI2, false);
    ctx.closePath();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    // Draw pointer (at top)
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(centerX - 12, 5);
    ctx.lineTo(centerX + 12, 5);
    ctx.lineTo(centerX, 25);
    ctx.closePath();
    ctx.fill();

    // Calculate current segment (pointer at top = -PI/2 = 270 degrees = where segment is now)
    // The pointer is at the top (12 o'clock position)
    // We need to find which segment is at that position
    const change = angleCurrent + Math.PI / 2;
    let segmentIndex = len - Math.floor((change / PI2) * len) - 1;
    if (segmentIndex < 0) segmentIndex = segmentIndex + len;
    while (segmentIndex >= len) segmentIndex -= len;
    
    const currentSeg = segments[segmentIndex];
    setCurrentSegmentName(currentSeg.label);
    
    return currentSeg;
  }, [centerX, centerY, size, PI2]);

  // Initial draw
  useEffect(() => {
    if (isOpen) {
      drawWheel(angleRef.current);
    }
  }, [isOpen, drawWheel]);

  const spinWheel = () => {
    if (isSpinning || applied) return;
    
    setIsSpinning(true);
    setResult(null);
    
    // Pick random winning segment
    const randomIndex = Math.floor(Math.random() * segments.length);
    const winningSegment = segments[randomIndex];
    
    // Calculate target angle to land on winning segment
    // Each segment is PI2/4 = PI/2 radians (90 degrees)
    // Pointer is at top (-PI/2 from right = 3*PI/2 from 0)
    // Segment 0 starts at angle 0, so to land on segment i, 
    // the center of that segment should be at top (3*PI/2)
    const segmentSize = PI2 / segments.length;
    const segmentCenter = randomIndex * segmentSize + segmentSize / 2;
    
    // We need the segment center to be at the pointer position (top = -PI/2 = 3*PI/2)
    // angleCurrent + segmentCenter = 3*PI/2  =>  angleCurrent = 3*PI/2 - segmentCenter
    // But we rotate clockwise so: targetAngle = -(segmentCenter + PI/2)
    // Simplified: to land on segment i, angle should be negative of (segment center + PI/2)
    const targetAngle = PI2 - (segmentCenter + Math.PI / 2);
    
    // Add random full rotations (5-8 spins) + some randomness within the segment
    const fullSpins = (5 + Math.floor(Math.random() * 4)) * PI2;
    const randomOffset = (Math.random() - 0.5) * segmentSize * 0.6; // Stay within segment
    const totalRotation = fullSpins + targetAngle + randomOffset;
    
    spinStartRef.current = Date.now();
    const startAngle = angleRef.current;
    const duration = 4000; // 4 seconds
    
    const animate = () => {
      const elapsed = Date.now() - spinStartRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic - starts fast, slows down smoothly
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      // Calculate current angle based on progress
      angleRef.current = startAngle + totalRotation * easeOut;
      
      // Keep angle in bounds for display
      let displayAngle = angleRef.current % PI2;
      if (displayAngle < 0) displayAngle += PI2;
      
      drawWheel(displayAngle);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - use the winning segment we picked
        setIsSpinning(false);
        setResult(winningSegment);
        setApplied(true);
        
        // Auto-apply result
        setTimeout(() => {
          onResult(winningSegment.multiplier, winningSegment.label);
        }, 2000);
      }
    };
    
    animate();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(amount);
  };

  const getResultText = () => {
    if (!result) return '';
    const newAmount = fineAmount * result.multiplier;
    if (result.multiplier === 0) {
      return `🎉 Bøden slettes helt!`;
    } else if (result.multiplier === 0.5) {
      return `😊 Bøden halveres til ${formatCurrency(newAmount)}`;
    } else if (result.multiplier === 2) {
      return `😬 Bøden fordobles til ${formatCurrency(newAmount)}`;
    } else {
      return `😱 Bøden tredobles til ${formatCurrency(newAmount)}`;
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="wheel-overlay" onClick={(e) => e.target === e.currentTarget && !isSpinning && !applied && onClose()}>
      <div className="wheel-modal">
        {!isSpinning && !applied && (
          <button className="wheel-close" onClick={onClose}>×</button>
        )}
        
        <h2>🎰 Lykkehjul</h2>
        <p className="wheel-subtitle">
          Spin hjulet for at ændre bøden:<br/>
          <strong>{fineName}</strong> ({formatCurrency(fineAmount)})
        </p>
        
        <div className="wheel-container">
          <canvas 
            ref={canvasRef}
            width={(size + 10) * 2}
            height={(size + 10) * 2}
            style={{ display: 'block', margin: '0 auto' }}
          />
        </div>

        {/* Live segment indicator */}
        {isSpinning && currentSegmentName && (
          <div className="current-segment">{currentSegmentName}</div>
        )}

        {/* Legend */}
        <div className="wheel-legend">
          {segments.map((seg, i) => (
            <div key={i} className="legend-item">
              <span className="legend-color" style={{ background: seg.color }}></span>
              <span className="legend-text">{seg.label}</span>
            </div>
          ))}
        </div>

        {result && (
          <div className={`wheel-result ${result.multiplier <= 0.5 ? 'good' : 'bad'}`}>
            <p>{getResultText()}</p>
            <span className="auto-close">Lukker automatisk...</span>
          </div>
        )}

        {!result && !applied && (
          <button 
            className="spin-button" 
            onClick={spinWheel}
            disabled={isSpinning}
          >
            {isSpinning ? '🎰 Spinner...' : '🎰 SPIN!'}
          </button>
        )}
      </div>
    </div>
  );
}
