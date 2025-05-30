"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import BotStatusIndicator from "./BotStatusIndicator"
import BotControlButton from "./BotControlButton"
import UserProfile from "./UserProfile"

interface MeetControlPanelProps {
  initialStatus: "idle" | "awaiting" | "joined" | "stopped"
}

interface Participant {
  name: string
  email: string
  isHost: boolean
  isYou: boolean
}

const API_BASE_URL = "https://ainotestakerbackend.trylenoxinstruments.com/api" // Update with your actual API base URL

const MeetControlPanel: React.FC<MeetControlPanelProps> = ({ initialStatus }) => {
  const [status, setStatus] = useState<"idle" | "awaiting" | "joined" | "stopped">(initialStatus)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTime, setActiveTime] = useState<number>(0)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [botStartTime, setBotStartTime] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-collapse timer on initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExpanded(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  // Check bot status on component mount
  useEffect(() => {
    checkBotStatus()
  }, [])

  // Handle hover events for auto-collapse
  const startCollapseTimer = () => {
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

  // Timer effect for running bots
  useEffect(() => {
    let timerInterval: ReturnType<typeof setInterval> | null = null

    if (status === "joined" && botStartTime) {
      const startTime = new Date(botStartTime).getTime()
      
      const updateTimer = () => {
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - startTime) / 1000)
        setActiveTime(elapsedSeconds)
      }

      // Update immediately
      updateTimer()
      
      // Then update every second
      timerInterval = setInterval(updateTimer, 1000)
    } else {
      setActiveTime(0)
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval)
      }
    }
  }, [status, botStartTime])

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

  const getAuthHeaders = () => {
    const tokensRaw = localStorage.getItem("extensionTokens");
    let access = "";
    if (tokensRaw) {
      try {
        access = JSON.parse(tokensRaw).access;
      } catch {}
    }
    const headers: Record<string, string> = {
        "Authorization": `Bearer ${access}`,
        "Content-Type": "application/json",
      }
    return headers;
  }

  // Function to check bot status
  const checkBotStatus = async () => {
    try {
      const meetUrl = window.location.href
      const response = await fetch(`${API_BASE_URL}/bots/status-by-url/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ meeting_url: meetUrl }),
      })

      if (response.ok) {
        const data = await response.json()
        // Handle all possible bot_status values
        if (data.bot_status === "RUNNING") {
          setStatus("joined")
          setBotStartTime(data.start_time)
          if (typeof chrome !== "undefined" && chrome.runtime) {
            const chromeRuntime = chrome.runtime
            chromeRuntime.sendMessage({
              type: "SET_STATUS",
              status: "joined",
            })
          }
        } else if (
          data.bot_status === "ACTIVATING" ||
          data.bot_status === "AWAITING" ||
          data.bot_status === "PENDING" // add any other intermediate statuses here
        ) {
          setStatus("awaiting")
          setBotStartTime(data.start_time || null)
          if (typeof chrome !== "undefined" && chrome.runtime) {
            const chromeRuntime = chrome.runtime
            chromeRuntime.sendMessage({
              type: "SET_STATUS",
              status: "awaiting",
            })
          }
        } else if (data.bot_status === "STOPPED") {
          setStatus("stopped")
          setBotStartTime(null)
        } else {
          setStatus("idle")
          setBotStartTime(null)
        }
      } else if (response.status === 404) {
        setStatus("idle")
        setBotStartTime(null)
      }
    } catch (err) {
      console.error("Error checking bot status:", err)
      setStatus("idle")
    }
  }

  // Function to scrape participants from Google Meet
  const scrapeParticipants = (): Participant[] => {
    const participantsList: Participant[] = []
    
    try {
      // Look for the participants list container using jsname="jrQDbd"
      const participantsContainer = document.querySelector('div[jsname="jrQDbd"]')
      
      if (!participantsContainer) {
        console.warn('Participants container not found')
        return participantsList
      }

      // Get all participant list items
      const participantElements = participantsContainer.querySelectorAll('[role="listitem"]')
      
      participantElements.forEach((element) => {
        try {
          // Get participant name
          const nameElement = element.querySelector('.zWGUib')
          const name = nameElement?.textContent?.trim() || 'Unknown'
          
          // Check if it's the current user
          const isYou = element.querySelector('.NnTWjc')?.textContent?.includes('You') || false
          
          // Check if it's the host
          const isHost = element.querySelector('.d93U2d')?.textContent?.includes('Meeting host') || false
          
          // Try to extract email from avatar image source
          const avatarImg = element.querySelector('img.KjWwNd') as HTMLImageElement
          let email = ''
          
          if (avatarImg?.src) {
            // Google Meet avatar URLs often contain encoded email information
            // Try to extract email from the URL structure
            const urlMatch = avatarImg.src.match(/\/a\/([^\/]+)/)
            if (urlMatch) {
              // This is a basic approach - you might need to adjust based on actual URL patterns
              email = `${name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`
            }
          }
          
          // If we couldn't extract email from URL, try alternative methods
          if (!email) {
            // Look for any email-like text in the participant element
            const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/
            const elementText = element.textContent || ''
            const emailMatch = elementText.match(emailRegex)
            if (emailMatch) {
              email = emailMatch[0]
            } else {
              // Fallback: generate a placeholder email
              email = `${name.toLowerCase().replace(/\s+/g, '.')}@unknown.com`
            }
          }

          participantsList.push({
            name,
            email,
            isHost,
            isYou
          })
        } catch (error) {
          console.error('Error processing participant element:', error)
        }
      })
    } catch (error) {
      console.error('Error scraping participants:', error)
    }

    return participantsList
  }

  const startBot = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Scrape participants before starting the bot
      const participantsList = scrapeParticipants()
      setParticipants(participantsList)
      // Get the current URL
      const meetUrl = window.location.href
      // Prepare the request body with participants data
      const requestBody = {
        meeting_url: meetUrl,
        participant_emails: ["alijanali0091@gmail.com","aj829077@gmail.com"],
        platform: "GOOGLE_MEET"
      }
      console.log('Starting bot with data:', requestBody)
      // Send request to start the bot with participants data
      const response = await fetch(`${API_BASE_URL}/bots/start/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const data = await response.json()
        setStatus("awaiting")
        setBotStartTime(data.bot?.start_time || new Date().toISOString())
        
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
        setError(errorData.error || "Failed to start bot")
      }
    } catch (err) {
      setError("Server connection failed")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const stopBot = async () => {
    console.log("Status is : ", status)
    setIsLoading(true)
    setError(null)
    try {
      // Get the current URL
      const meetUrl = window.location.href
      // Send request to stop the bot
      const response = await fetch(`${API_BASE_URL}/bots/stop/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ meeting_url: meetUrl }),
      })

      if (response.ok) {
        setStatus("stopped")
        setBotStartTime(null)
        
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
        // Clear participants when stopping
        setParticipants([])
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to stop bot")
      }
    } catch (err) {
      setError("Server connection failed")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to manually refresh participants (useful for testing)
  const refreshParticipants = () => {
    const participantsList = scrapeParticipants()
    setParticipants(participantsList)
    console.log('Refreshed participants:', participantsList)
  }

  // Polling logic
  let pollingInterval: number | null = null

  const startPolling = () => {
    if (pollingInterval) clearInterval(pollingInterval)
    pollingInterval = window.setInterval(async () => {
      try {
        const meetUrl = window.location.href
        const response = await fetch(`${API_BASE_URL}/bots/status-by-url/`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ meeting_url: meetUrl }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.bot_status === "RUNNING") {
            setStatus("joined")
            setBotStartTime(data.start_time)
            if (typeof chrome !== "undefined" && chrome.runtime) {
              const chromeRuntime = chrome.runtime
              chromeRuntime.sendMessage({
                type: "SET_STATUS",
                status: "joined",
              })
            }
            stopPolling()
          } else if (
            data.bot_status === "ACTIVATING" ||
            data.bot_status === "AWAITING" ||
            data.bot_status === "PENDING" // add any other intermediate statuses here
          ) {
            setStatus("awaiting")
            setBotStartTime(data.start_time || null)
            if (typeof chrome !== "undefined" && chrome.runtime) {
              const chromeRuntime = chrome.runtime
              chromeRuntime.sendMessage({
                type: "SET_STATUS",
                status: "awaiting",
              })
            }
          } else if (data.bot_status === "STOPPED") {
            setStatus("stopped")
            setBotStartTime(null)
            stopPolling()
          } else {
            setStatus("idle")
            setBotStartTime(null)
            stopPolling()
          }
        } else if (response.status === 404) {
          setStatus("idle")
          setBotStartTime(null)
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

  const participantsIcon = (
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
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
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
          <UserProfile/>
          <BotStatusIndicator status={status} />

          {/* Participants Section */}
          {participants.length > 0 && (
            <div className="mt-4 modern-dark-card p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {participantsIcon}
                  <span className="font-medium text-sm text-white ml-2">
                    Participants ({participants.length})
                  </span>
                </div>
                <button
                  onClick={refreshParticipants}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Refresh
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {participants.map((participant, index) => (
                  <div key={index} className="text-xs text-gray-300 flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {participant.name}
                        {participant.isYou && <span className="text-blue-400 ml-1">(You)</span>}
                        {participant.isHost && <span className="text-orange-400 ml-1">(Host)</span>}
                      </div>
                      <div className="text-gray-400 text-xs">{participant.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            {/* Show Start button only when status is idle or stopped */}
            {(status === "idle" || status === "stopped") && (
              <BotControlButton
                onClick={startBot}
                disabled={isLoading}
                variant="primary"
                isLoading={isLoading}
                icon={!isLoading ? startIcon : undefined}
              >
                {isLoading ? "Starting..." : "Start AI Notes"}
              </BotControlButton>
            )}

            {/* Show Stop button only when bot is running (awaiting or joined) */}
            {(status === "awaiting" || status === "joined") && (
              <BotControlButton
                onClick={stopBot}
                disabled={isLoading}
                variant="secondary"
                isLoading={isLoading && status === "joined"}
                icon={!isLoading ? stopIcon : undefined}
              >
                {isLoading ? "Stopping..." : "Stop Bot"}
              </BotControlButton>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MeetControlPanel