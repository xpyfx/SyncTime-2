import React, { useState } from 'react';
import { motion, PanInfo, useAnimation, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { Info, Undo2 } from 'lucide-react';

interface SwipeableWrapperProps {
  children: React.ReactNode;
  leftAction: { icon: React.ElementType, color: string, label: string, onTrigger: () => void };
  rightAction: { icon: React.ElementType, color: string, label: string, onTrigger: () => void };
  onHide?: () => void;
  onRestore?: () => void;
}

export const SwipeableWrapper: React.FC<SwipeableWrapperProps> = ({ 
  children, 
  leftAction, 
  rightAction,
}) => {
  const [dragProgress, setDragProgress] = useState(0); // -1 to 1
  const controls = useAnimation();
  const x = useMotionValue(0);
  
  const threshold = 100;

  const handleDrag = (_: any, info: PanInfo) => {
    // Calculate progress based on distance dragged
    // 0 = center, 1 = right (threshold), -1 = left (-threshold)
    const progress = info.offset.x / threshold;
    setDragProgress(Math.max(-1.5, Math.min(1.5, progress)));
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const dragX = info.offset.x;
    
    if (dragX > threshold) {
      rightAction.onTrigger();
    } else if (dragX < -threshold) {
      leftAction.onTrigger();
    }
    
    setDragProgress(0);
  };

  const isRightActive = dragProgress >= 1;
  const isLeftActive = dragProgress <= -1;

  return (
    <div className="relative mb-4 overflow-hidden rounded-[32px] cursor-grab active:cursor-grabbing">
      {/* Background Icons Layer */}
      <div className="absolute inset-0 flex items-center justify-between px-10 bg-apple-gray-50/50 pointer-events-none">
        <div 
          className="transition-all duration-200 ease-out"
          style={{ 
            opacity: Math.max(0, dragProgress),
            transform: `scale(${0.5 + Math.max(0, dragProgress * 0.5)}) translateX(${(dragProgress - 1) * 20}px)`
          }}
        >
          <rightAction.icon 
            size={36} 
            className={`transition-colors duration-300 ${isRightActive ? rightAction.color : 'text-apple-gray-200'}`}
            fill={isRightActive ? 'currentColor' : 'none'}
          />
        </div>

        <div 
          className="transition-all duration-200 ease-out"
          style={{ 
            opacity: Math.max(0, -dragProgress),
            transform: `scale(${0.5 + Math.max(0, -dragProgress * 0.5)}) translateX(${(dragProgress + 1) * 20}px)`
          }}
        >
          <leftAction.icon 
            size={36} 
            className={`transition-colors duration-300 ${isLeftActive ? leftAction.color : 'text-apple-gray-200'}`}
            fill={isLeftActive ? 'currentColor' : 'none'}
          />
        </div>
      </div>

      {/* Draggable Content Layer */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.8}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x, touchAction: 'pan-y' }}
        className="relative z-10 will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
};
