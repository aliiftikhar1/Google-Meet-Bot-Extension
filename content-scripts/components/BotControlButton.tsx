"use client"

import React from "react"

interface BotControlButtonProps {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant: "primary" | "secondary"
  isLoading?: boolean
  icon?: React.ReactNode
}

const BotControlButton: React.FC<BotControlButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  isLoading = false,
  icon,
}) => {
  const baseClasses = "modern-button transition-all duration-300 flex items-center justify-center flex-1"

  const variantClasses = {
    primary: "primary-button",
    secondary: "secondary-button",
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? "cursor-not-allowed" : ""}`}
    >
      {isLoading ? (
        <svg className="animate-spin mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  )
}

export default BotControlButton
