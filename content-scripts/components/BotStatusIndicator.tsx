import React from "react"

interface BotStatusIndicatorProps {
  status: "idle" | "awaiting" | "joined" | "stopped"
}

const BotStatusIndicator: React.FC<BotStatusIndicatorProps> = ({ status }) => {
  const getStatusInfo = () => {
    switch (status) {
      case "idle":
        return {
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          ),
          title: "Ready to Start",
          description: 'Click "Start AI Notes" to begin',
          statusClass: "idle",
          textColor: "text-white",
        }
      case "awaiting":
        return {
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin"
            >
              <path d="M22 12c0 6-4.39 10-9.806 10C7.792 22 4.24 19.665 3 16"></path>
              <path d="M2 12C2 6 6.39 2 11.806 2 16.209 2 19.76 4.335 21 8"></path>
              <path d="M7 17l-4-1-1 4"></path>
              <path d="M17 7l4 1 1-4"></path>
            </svg>
          ),
          title: "Awaiting Bot to Join...",
          description: "Bot is trying to join the meeting",
          statusClass: "awaiting",
          textColor: "status-awaiting",
        }
      case "joined":
        return {
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          ),
          title: "Bot is Working",
          description: "AI is taking notes of your meeting",
          statusClass: "joined",
          textColor: "status-joined",
        }
      case "stopped":
        return {
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          ),
          title: "Bot Stopped",
          description: "The AI bot has been disconnected",
          statusClass: "stopped",
          textColor: "status-stopped",
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div
      className={`modern-dark-card status-card ${statusInfo.statusClass} p-4 transition-all duration-300 ease-in-out`}
    >
      <div className="flex items-center">
        <div className={`status-icon-container ${statusInfo.statusClass} flex-shrink-0`}>
          <div className={`status-${statusInfo.statusClass}`}>{statusInfo.icon}</div>
        </div>
        <div>
          <h3 className={`font-semibold text-base ${statusInfo.textColor}`}>{statusInfo.title}</h3>
          <div className="text-gray-400 text-sm mt-1">{statusInfo.description}</div>
        </div>
      </div>
    </div>
  )
}

export default BotStatusIndicator
