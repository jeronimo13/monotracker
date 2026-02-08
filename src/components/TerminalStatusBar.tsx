import React from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

export type TerminalStatusLevel = "info" | "success" | "error";

export interface TerminalStatusMessage {
  level: TerminalStatusLevel;
  text: string;
  timestamp: number;
}

interface TerminalStatusBarProps {
  message: TerminalStatusMessage;
}

const statusStyles: Record<
  TerminalStatusLevel,
  { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; accent: string }
> = {
  info: {
    icon: InformationCircleIcon,
    accent: "text-sky-300",
  },
  success: {
    icon: CheckCircleIcon,
    accent: "text-emerald-300",
  },
  error: {
    icon: ExclamationTriangleIcon,
    accent: "text-red-300",
  },
};

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const TerminalStatusBar: React.FC<TerminalStatusBarProps> = ({ message }) => {
  const { icon: Icon, accent } = statusStyles[message.level];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-100">
      <div className="mx-auto flex max-w-[1920px] items-center gap-2">
        <span className="font-mono text-[11px] text-gray-400">STATUS</span>
        <Icon className={`h-4 w-4 ${accent}`} />
        <span className="min-w-0 flex-1 truncate font-mono">{message.text}</span>
        <span className="font-mono text-[11px] text-gray-400">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
};

export default TerminalStatusBar;
