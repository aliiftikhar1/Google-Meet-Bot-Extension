type StatusProps = {
  status: "idle" | "awaiting" | "joined" | "stopped"
  isGoogleMeet: boolean
}

export default function StatusIndicator({ status, isGoogleMeet }: StatusProps) {
  const getStatusInfo = () => {
    switch (status) {
      case "idle":
        return {
          icon: (
            <div className="p-2 bg-gray-100 rounded-full">
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
                className="text-gray-500"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
          ),
          title: "Ready to Start",
          description: 'Click "Start AI Notes" to begin recording your meeting',
          color: "bg-gray-50 text-gray-700 border-gray-100",
        }
      case "awaiting":
        return {
          icon: (
            <div className="p-2 bg-blue-100 rounded-full">
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
                className="text-blue-500 animate-spin"
              >
                <path d="M22 12c0 6-4.39 10-9.806 10C7.792 22 4.24 19.665 3 16"></path>
                <path d="M2 12C2 6 6.39 2 11.806 2 16.209 2 19.76 4.335 21 8"></path>
                <path d="M7 17l-4-1-1 4"></path>
                <path d="M17 7l4 1 1-4"></path>
              </svg>
            </div>
          ),
          title: "Awaiting Bot to Join...",
          description: "The AI bot is attempting to join your meeting",
          color: "bg-blue-50 text-blue-700 border-blue-100",
        }
      case "joined":
        return {
          icon: (
            <div className="p-2 bg-emerald-100 rounded-full">
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
                className="text-emerald-500"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
          ),
          title: "Bot is Working",
          description: "AI is actively taking notes of your meeting",
          color: "bg-emerald-50 text-emerald-700 border-emerald-100",
        }
      case "stopped":
        return {
          icon: (
            <div className="p-2 bg-red-100 rounded-full">
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
                className="text-red-500"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
          ),
          title: "Bot Stopped",
          description: "The AI bot has been disconnected from the meeting",
          color: "bg-red-50 text-red-700 border-red-100",
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className={`rounded-xl p-4 ${statusInfo.color} border shadow-sm transition-all duration-300 ease-in-out`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">{statusInfo.icon}</div>
        <div className="ml-3">
          <h3 className="text-sm font-medium">{statusInfo.title}</h3>
          <div className="mt-1 text-xs opacity-90">{statusInfo.description}</div>
        </div>
      </div>
    </div>
  )
}
