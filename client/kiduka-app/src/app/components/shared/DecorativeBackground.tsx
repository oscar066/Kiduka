"use client";

import React from "react";

/**
 * A shared decorative background component that adds animated, blurred blobs
 * to the background of the application. Designed to be placed in the global
 * layout or high-level containers.
 */
export function DecorativeBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* Top-left green blob */}
      <div 
        className="absolute -top-24 -left-24 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"
      />
      
      {/* Bottom-right amber blob */}
      <div 
        className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"
      />
      
      {/* Optional: Add a subtle third blob for more depth if desired */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white opacity-40 mix-blend-soft-light filter blur-3xl rounded-full"
      />
    </div>
  );
}
