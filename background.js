// Background script to handle communication between popup and content scripts
let botStatus = "idle"
let ports = []

// Listen for connections from content scripts
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "meet-bot-port") {
    // Add the port to our list
    ports.push(port)

    // Listen for messages from this port
    port.onMessage.addListener((msg) => {
      if (msg.type === "GET_STATUS") {
        // Send the current status to the content script
        port.postMessage({ type: "STATUS_UPDATE", status: botStatus })
      } else if (msg.type === "SET_STATUS") {
        // Update the status and broadcast to all connected ports
        botStatus = msg.status
        broadcastStatus()
      }
    })

    // Clean up when port disconnects
    port.onDisconnect.addListener(() => {
      ports = ports.filter((p) => p !== port)
    })
  }
})

// Function to broadcast status to all connected content scripts
function broadcastStatus() {
  ports.forEach((port) => {
    port.postMessage({ type: "STATUS_UPDATE", status: botStatus })
  })
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_STATUS") {
    sendResponse({ status: botStatus })
  } else if (message.type === "SET_STATUS") {
    botStatus = message.status
    broadcastStatus()
    sendResponse({ success: true })
  }
  return true // Required for async sendResponse
})
