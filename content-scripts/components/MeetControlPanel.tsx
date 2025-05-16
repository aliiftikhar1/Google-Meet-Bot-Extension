"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import BotStatusIndicator from "./BotStatusIndicator"
import BotControlButton from "./BotControlButton"

interface MeetControlPanelProps {
  initialStatus: "idle" | "awaiting" | "joined" | "stopped"
}

const MeetControlPanel: React.FC<MeetControlPanelProps> = ({ initialStatus }) => {
  const [status, setStatus] = useState<"idle" | "awaiting" | "joined" | "stopped">(initialStatus)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTime, setActiveTime] = useState<number>(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-collapse timer on initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExpanded(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  // Handle hover events for auto-collapse
  const startCollapseTimer = () => {
    // Clear any existing timer
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current)
    }

    // Set new timer
    collapseTimerRef.current = setTimeout(() => {
      setIsExpanded(false)
    }, 5000)
  }

  const clearCollapseTimer = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = null
    }
  }

  useEffect(() => {
    // Listen for status updates from the content script
    const handleStatusUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      setStatus(customEvent.detail.status)
    }

    const panel = document.getElementById("meet-bot-control-panel")
    if (panel) {
      panel.addEventListener("bot-status-update", handleStatusUpdate)
    }

    return () => {
      if (panel) {
        panel.removeEventListener("bot-status-update", handleStatusUpdate)
      }
    }
  }, [])

  useEffect(() => {
    let timerInterval: ReturnType<typeof setInterval> | null = null

    if (status === "joined") {
      timerInterval = setInterval(() => {
        setActiveTime((prev) => prev + 1)
      }, 1000)
    } else {
      setActiveTime(0)
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval)
      }
    }
  }, [status])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    const pad = (num: number) => num.toString().padStart(2, "0")

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`
    }
    return `${pad(minutes)}:${pad(remainingSeconds)}`
  }

  const startBot = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get the current URL
      const meetUrl = window.location.href

      // Send request to start the bot
      const response = await fetch("http://localhost:8000/start-bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ meetUrl }),
      })

      if (response.ok) {
        setStatus("awaiting")
        // Update status in background script
        if (typeof chrome !== "undefined" && chrome.runtime) {
          const chromeRuntime = chrome.runtime
          chromeRuntime.sendMessage({
            type: "SET_STATUS",
            status: "awaiting",
          })
        }
        // Start polling for status
        startPolling()
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to start bot")
      }
    } catch (err) {
      setError("Server connection failed")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const stopBot = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get the current URL
      const meetUrl = window.location.href

      // Send request to stop the bot
      const response = await fetch("http://localhost:8000/stop-bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ meetUrl }),
      })

      if (response.ok) {
        setStatus("stopped")
        // Update status in background script
        if (typeof chrome !== "undefined" && chrome.runtime) {
          const chromeRuntime = chrome.runtime
          chromeRuntime.sendMessage({
            type: "SET_STATUS",
            status: "stopped",
          })
        }
        // Stop polling
        stopPolling()
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Failed to stop bot")
      }
    } catch (err) {
      setError("Server connection failed")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Polling logic
  let pollingInterval: number | null = null

  const startPolling = () => {
    if (pollingInterval) clearInterval(pollingInterval)

    pollingInterval = window.setInterval(async () => {
      try {
        const response = await fetch("http://localhost:8000/bot-status")
        const data = await response.json()

        if (data.status === "joined") {
          setStatus("joined")
          // Update status in background script
          if (typeof chrome !== "undefined" && chrome.runtime) {
            const chromeRuntime = chrome.runtime
            chromeRuntime.sendMessage({
              type: "SET_STATUS",
              status: "joined",
            })
          }
          stopPolling()
        }
      } catch (err) {
        console.error("Error polling bot status:", err)
      }
    }, 3000)
  }

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval)
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
    }
  }, [])

  const startIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8V4H8"></path>
      <rect x="2" y="2" width="20" height="20" rx="5"></rect>
      <path d="M16 16h.01"></path>
      <path d="M12 16h.01"></path>
      <path d="M8 16h.01"></path>
      <path d="M16 12h.01"></path>
      <path d="M12 12h.01"></path>
      <path d="M8 12h.01"></path>
    </svg>
  )

  const stopIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="9" x2="15" y2="15"></line>
      <line x1="15" y1="9" x2="9" y2="15"></line>
    </svg>
  )

  return (
    <div
      ref={panelRef}
      style={{ overflow: "hidden" }}
      className={`modern-dark-bg transition-all duration-500 ease-in-out overflow-hidden rounded-xl ${
        isExpanded ? "w-64" : "w-12"
      }`}
      onMouseEnter={() => {
        clearCollapseTimer()
        if (!isExpanded) {
          setIsExpanded(true)
        }
      }}
      onMouseLeave={() => {
        if (isExpanded) {
          startCollapseTimer()
        }
      }}
    >
      <div className="flex items-center justify-between p-3 modern-dark-header">
        <div className="flex items-center">
          {isExpanded && (
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 text-white"
              >
                <path d="M12 8V4H8"></path>
                <rect x="2" y="2" width="20" height="20" rx="5"></rect>
                <path d="M16 16h.01"></path>
                <path d="M12 16h.01"></path>
                <path d="M8 16h.01"></path>
                <path d="M16 12h.01"></path>
                <path d="M12 12h.01"></path>
                <path d="M8 12h.01"></path>
              </svg>
              <span className="font-semibold text-base text-white">AI Notes Bot</span>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setIsExpanded(!isExpanded)
            if (!isExpanded) {
              // Clear any existing timer when manually expanding
              clearCollapseTimer()
            } else {
              // When manually collapsing, no need to set timer
            }
          }}
          className="transition-all flex items-center justify-center"
          style={{
            padding: "0",
            width: "32px",
            height: "32px",
            background: "transparent",
            outline: "none",
            boxShadow: "none",
            borderRadius: "50%",
            overflow: "hidden"
          }}
        >
          <img
            src="https://static.vecteezy.com/system/resources/thumbnails/007/225/199/small_2x/robot-chat-bot-concept-illustration-vector.jpg"
            alt={isExpanded ? "Collapse" : "Expand"}
            style={{
              objectFit: "cover",
              width: "100%",
              height: "100%",
              boxShadow: "none",
              borderRadius: "0"
            }}
            className="text-white"
          />
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 fade-in">
          <BotStatusIndicator status={status} />

          {status === "joined" && (
            <div className="mt-4 modern-dark-card p-3 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 status-joined"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span className="font-medium text-sm text-white">Active Time: {formatTime(activeTime)}</span>
            </div>
          )}

          {error && (
            <div className="mt-4 modern-dark-card p-3 flex items-center status-stopped">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span className="font-medium text-sm">{error}</span>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <BotControlButton
              onClick={startBot}
              disabled={status === "awaiting" || status === "joined" || isLoading}
              variant="primary"
              isLoading={isLoading && status !== "joined" && status !== "stopped"}
              icon={!isLoading ? startIcon : undefined}
            >
              {status === "idle" || status === "stopped" ? "Start AI Notes" : "Starting..."}
            </BotControlButton>

            <BotControlButton
              onClick={stopBot}
              disabled={status !== "joined" || isLoading}
              variant="secondary"
              isLoading={isLoading && status === "joined"}
              icon={!isLoading ? stopIcon : undefined}
            >
              Stop Bot
            </BotControlButton>
          </div>
        </div>
      )}
    </div>
  )
}

export default MeetControlPanel