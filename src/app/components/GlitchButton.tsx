"use client";

import React, { useState, useRef } from "react";
import { twMerge } from "tailwind-merge";

interface GlitchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  glitchOnHover?: boolean;
  glitchAlways?: boolean;
  glitchColors?: {
    primary?: string;
    secondary?: string;
  };
}

export const GlitchButton: React.FC<GlitchButtonProps> = ({
  children,
  className = "",
  glitchOnHover = true,
  glitchAlways = false,
  glitchColors = {
    primary: "#ef00ef",
    secondary: "#00ffff",
  },
  ...props
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const showGlitch = glitchAlways || (glitchOnHover && isHovering) || isClicked;

  const textShadowStyle = {
    textShadow: `
      -1.5px -1.5px 0 ${glitchColors.primary}, 
      1.5px 1.5px 0 ${glitchColors.secondary}
    `,
  };

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 500);
  };

  const containerClasses = twMerge(
    "tool-btn",
    "relative overflow-hidden",
    isClicked ? "click-glitch" : "",
    className,
  );

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={containerClasses}
      {...props}
    >
      {/* Normal State */}
      <span
        className={`
          flex gap-4 items-center justify-center
          ${showGlitch ? "opacity-0" : "opacity-100"} 
          transition-opacity
          ${glitchAlways ? "flicker-animation" : ""}
        `}
      >
        {children}
      </span>

      {/* Glitch Effect */}
      {showGlitch && (
        <div
          className={`
            absolute inset-0 
            overflow-hidden 
            bg-purple-dark
            ${isClicked ? "glitch-skew" : ""}
          `}
        >
          {/* Top Layer */}
          <div className="absolute left-0 w-full h-1/3 top-0 bg-black-300 overflow-hidden glitch-layer-1">
            <div
              className="absolute w-full text-white top-0 left-0 right-0 flex gap-4 items-center justify-center h-full"
              style={textShadowStyle}
            >
              <div className="transform translate-y-0 mt-11.25 flex gap-4 items-center">
                {children}
              </div>
            </div>
          </div>

          {/* Middle Layer */}
          <div className="absolute left-0 w-full h-1/3 top-1/3 bg-black-300 overflow-hidden glitch-layer-2">
            <div
              className="absolute w-full text-white top-0 left-0 right-0 flex gap-4 items-center justify-center h-[300%] -translate-y-1/3"
              style={textShadowStyle}
            >
              <div className="flex gap-4 items-center">{children}</div>
            </div>
          </div>

          {/* Bottom Layer */}
          <div className="absolute left-0 w-full h-1/3 top-2/3 bg-black-300 overflow-hidden glitch-layer-3">
            <div
              className="absolute w-full text-white top-0 left-0 right-0 flex gap-4 items-center justify-center h-[300%] -translate-y-2/3"
              style={textShadowStyle}
            >
              <div className="flex gap-4 items-center">{children}</div>
            </div>
          </div>
        </div>
      )}
    </button>
  );
};
