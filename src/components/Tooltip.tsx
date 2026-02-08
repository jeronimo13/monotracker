import React, { useState, useRef, useEffect, useCallback } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  className = "",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const setStaticTooltipPosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const tooltipEl = tooltipRef.current;
    if (!triggerEl || !tooltipEl) {
      return;
    }

    const triggerRect = triggerEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const edgePadding = 8;
    const offset = 8;

    let x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    x = Math.max(edgePadding, Math.min(x, viewportWidth - tooltipRect.width - edgePadding));

    let y = triggerRect.bottom + offset;
    if (y + tooltipRect.height > viewportHeight - edgePadding) {
      y = triggerRect.top - tooltipRect.height - offset;
    }
    y = Math.max(edgePadding, Math.min(y, viewportHeight - tooltipRect.height - edgePadding));

    tooltipEl.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    tooltipEl.style.opacity = "1";
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    setStaticTooltipPosition();
    return () => {
      const tooltipEl = tooltipRef.current;
      if (tooltipEl) {
        tooltipEl.style.opacity = "0";
      }
    };
  }, [isVisible, setStaticTooltipPosition]);

  return (
    <span
      ref={triggerRef}
      className={`inline-flex ${className}`}
      onPointerEnter={() => setIsVisible(true)}
      onPointerLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed left-0 top-0 z-50 max-w-80 rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg whitespace-pre-line pointer-events-none"
          style={{
            transform: "translate3d(-9999px, -9999px, 0)",
            opacity: 0,
            willChange: "transform",
          }}
        >
          {content}
        </div>
      )}
    </span>
  );
};

Tooltip.displayName = "Tooltip";

export default React.memo(Tooltip);
