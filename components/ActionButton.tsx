"use client"

import React from 'react'; 

type ButtonProps = {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant: "primary" | "danger"
  isLoading?: boolean
}

export default function ActionButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  isLoading = false,
}: ButtonProps) {
  const baseClasses =
    "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center min-w-[120px] shadow-sm hover:shadow-md active:scale-95 transform"

  const variantClasses = {
    primary:
      "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white disabled:from-emerald-300 disabled:to-teal-300",
    danger:
      "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white disabled:from-red-300 disabled:to-rose-300",
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : null}
      {children}
    </button>
  )
}
