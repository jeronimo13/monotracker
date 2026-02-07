import React from "react";

interface ChipComponentProps {
  label: string;
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "error";
  size?: "small" | "medium" | "large";
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const ChipComponent: React.FC<ChipComponentProps> = ({
  label,
  variant = "default",
  size = "medium",
  removable = false,
  onRemove,
  onClick,
  disabled = false,
  className = "",
}) => {
  const variantClasses = {
    default: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      hover: "hover:bg-gray-200",
      border: "border-gray-300",
    },
    primary: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      hover: "hover:bg-blue-200",
      border: "border-blue-300",
    },
    secondary: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      hover: "hover:bg-purple-200",
      border: "border-purple-300",
    },
    success: {
      bg: "bg-green-100",
      text: "text-green-700",
      hover: "hover:bg-green-200",
      border: "border-green-300",
    },
    warning: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      hover: "hover:bg-yellow-200",
      border: "border-yellow-300",
    },
    error: {
      bg: "bg-red-100",
      text: "text-red-700",
      hover: "hover:bg-red-200",
      border: "border-red-300",
    },
  };

  const sizeClasses = {
    small: {
      padding: "px-2 py-1",
      text: "text-xs",
      removeButton: "w-4 h-4",
    },
    medium: {
      padding: "px-3 py-1.5",
      text: "text-sm",
      removeButton: "w-5 h-5",
    },
    large: {
      padding: "px-4 py-2",
      text: "text-base",
      removeButton: "w-6 h-6",
    },
  };

  const classes = variantClasses[variant];
  const sizeClass = sizeClasses[size];

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove && !disabled) {
      onRemove();
    }
  };

  const handleClick = () => {
    if (onClick && !disabled) {
      onClick();
    }
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2
        ${classes.bg} ${classes.text} ${classes.border}
        ${sizeClass.padding} ${sizeClass.text}
        border rounded-full font-medium
        ${!disabled ? classes.hover : "opacity-50 cursor-not-allowed"}
        ${onClick && !disabled ? "cursor-pointer" : ""}
        transition-colors duration-200
        ${className}
      `}
      onClick={handleClick}
    >
      <span className="truncate">{label}</span>
      {removable && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          className={`
            ${sizeClass.removeButton}
            flex items-center justify-center
            rounded-full
            ${classes.text}
            hover:bg-black/10
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
            focus:ring-current
            transition-colors duration-200
            ${disabled ? "cursor-not-allowed opacity-50" : ""}
          `}
          aria-label={`Видалити ${label}`}
        >
          <svg
            className="w-3 h-3"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ChipComponent;
