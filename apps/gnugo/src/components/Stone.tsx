/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Player } from '../gameLogic';

interface StoneProps {
  color: Player;
  isNew?: boolean;
  variant?: 'cute' | 'professional';
  connections?: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  };
  diagonalConnections?: {
    topLeft: boolean;
    topRight: boolean;
    bottomLeft: boolean;
    bottomRight: boolean;
  };
}

export const Stone: React.FC<StoneProps> = ({ color, isNew, variant = 'cute', connections, diagonalConnections }) => {
  const isBlack = color === 'black';
  const isCute = variant === 'cute';

  const borderColor = isBlack ? 'border-zinc-950' : 'border-zinc-300';
  const bgColor = isBlack ? 'bg-zinc-800' : 'bg-white';

  return (
    <motion.div
      initial={isNew ? { scale: 0, y: -10 } : { scale: 0.8 }}
      animate={{ scale: 0.8, y: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 600, 
        damping: 30 
      }}
      className="relative w-full h-full flex items-center justify-center"
    >
      {/* Diagonal Spikes Connection */}
      {diagonalConnections && (
        <div className="absolute inset-0 pointer-events-none z-[-1]">
          {diagonalConnections.topLeft && (
            <div className="absolute top-1/2 left-1/2 w-[141%] h-[2px] origin-left -rotate-[135deg] opacity-60" />
          )}
          {diagonalConnections.topRight && (
            <div className="absolute top-1/2 left-1/2 w-[141%] h-[2px] origin-left -rotate-[45deg] opacity-60" />
          )}
          {diagonalConnections.bottomLeft && (
            <div className="absolute top-1/2 left-1/2 w-[141%] h-[2px] origin-left rotate-[135deg] opacity-60" />
          )}
          {diagonalConnections.bottomRight && (
            <div className="absolute top-1/2 left-1/2 w-[141%] h-[2px] origin-left rotate-[45deg] opacity-60" />
          )}
        </div>
      )}

      {/* Shadow layer (outside filter for consistency) */}
      <div className={`absolute inset-0 rounded-full ${isBlack ? 'shadow-[0_4px_8px_rgba(0,0,0,0.3)]' : 'shadow-[0_4px_8px_rgba(0,0,0,0.1)]'} z-0`} />

      {/* The "Body" with Gooey Filter */}
      <div 
        className={`absolute inset-[-4px] ${bgColor} rounded-full border-2 ${borderColor} transition-all duration-200`}
        style={{ filter: 'url(#goo)' }}
      >
        {/* Connection extensions to trigger the gooey effect */}
        {connections && (
          <>
            {connections.top && <div className={`absolute -top-4 left-2 right-2 bottom-1/2 ${bgColor}`} />}
            {connections.bottom && <div className={`absolute -bottom-4 left-2 right-2 top-1/2 ${bgColor}`} />}
            {connections.left && <div className={`absolute -left-4 top-2 bottom-2 right-1/2 ${bgColor}`} />}
            {connections.right && <div className={`absolute -right-4 top-2 bottom-2 left-1/2 ${bgColor}`} />}
          </>
        )}
        {/* Diagonal spikes to trigger gooey effect */}
        {diagonalConnections && (
          <>
            {diagonalConnections.topLeft && <div className={`absolute top-0 left-0 w-4 h-4 ${bgColor} rotate-45 -translate-x-1/2 -translate-y-1/2`} />}
            {diagonalConnections.topRight && <div className={`absolute top-0 right-0 w-4 h-4 ${bgColor} rotate-45 translate-x-1/2 -translate-y-1/2`} />}
            {diagonalConnections.bottomLeft && <div className={`absolute bottom-0 left-0 w-4 h-4 ${bgColor} rotate-45 -translate-x-1/2 translate-y-1/2`} />}
            {diagonalConnections.bottomRight && <div className={`absolute bottom-0 right-0 w-4 h-4 ${bgColor} rotate-45 translate-x-1/2 translate-y-1/2`} />}
          </>
        )}
      </div>

      {/* Glossy Highlight (Inside filter for organic feel) */}
      <div 
        className="absolute top-[15%] left-[15%] w-[30%] h-[20%] bg-white/40 rounded-full blur-[1px] -rotate-12 pointer-events-none z-10"
        style={{ filter: 'url(#goo)' }}
      />

      {/* Eyes and Face (Outside filter to stay sharp) */}
      {isCute && (
        <div className="relative w-full h-full flex items-center justify-center z-30">
          <div className="flex justify-center gap-1.5 w-full">
            <div className="w-3 h-4 rounded-full bg-white border border-zinc-300 flex items-center justify-center overflow-hidden shadow-sm">
              <div className={`w-1.5 h-1.5 rounded-full ${isBlack ? 'bg-zinc-900' : 'bg-zinc-800'} mt-1`} />
            </div>
            <div className="w-3 h-4 rounded-full bg-white border border-zinc-300 flex items-center justify-center overflow-hidden shadow-sm">
              <div className={`w-1.5 h-1.5 rounded-full ${isBlack ? 'bg-zinc-900' : 'bg-zinc-800'} mt-1`} />
            </div>
          </div>
          <div className={`absolute bottom-[22%] w-2 h-1 rounded-full border-b-2 ${isBlack ? 'border-white/30' : 'border-zinc-800/30'}`} />
        </div>
      )}
      
      {/* Professional Variant Shine */}
      {!isCute && (
        <div className={`
          absolute inset-0 z-10 rounded-full opacity-40 pointer-events-none
          ${isBlack ? 'bg-gradient-to-br from-white/20 to-transparent' : 'bg-gradient-to-br from-white/80 to-transparent'}
        `} />
      )}
    </motion.div>
  );
};
