import React from "react"
import { createRoot } from "react-dom/client"
import MeetControlPanel from "./components/MeetControlPanel"
import MeetAuthPanel from "./components/MeetAuthPanel"

// Stronger type definitions
type BotStatus = "idle" | "awaiting" | "joined" | "stopped" | "error"
type PortMessage = {
  type: string
  status?: BotStatus
  error?: string
  data?: any
}

// Extension state

interface ExtensionState {
  port: chrome.runtime.Port | null
  status: BotStatus
  retryCount: number
  observer: MutationObserver | null
  isAuthenticated: boolean // Add authentication state
}

const state: ExtensionState = {
  port: null,
  status: "idle",
  retryCount: 0,
  observer: null,
  isAuthenticated: false, // Initialize as false
}

// Constants
const MAX_RETRIES = 5
const RETRY_DELAY = 1000
const PANEL_ID = "meet-bot-control-panel"
const MEET_CONTAINER_SELECTORS = [
  '[jsname="x2XZJc"]', // Main controls container
  '[jsname="EaZ7Cc"]', // Bottom control bar
  '[jsname="Tmb7Fd"]', // Call controls
  '[role="main"]', // Main content area
  "div[jscontroller]", // Any controller div
  "#yDmH0d", // Root container
  "body", // Fallback to body
]

// Meeting detection selectors
const MEETING_ACTIVE_SELECTORS = [
  '[jsname="x2XZJc"]', // Main controls container
  '[jsname="EaZ7Cc"]', // Bottom control bar
  '[jsname="Tmb7Fd"]', // Call controls
  "[data-allocation-index]", // Participant video container
  '[data-is-call-started="true"]', // Call started indicator
]

// Declare chrome if it's not already defined
declare const chrome: any

// Check if meeting is active
function isMeetingActive(): boolean {
  for (const selector of MEETING_ACTIVE_SELECTORS) {
    const element = document.querySelector(selector)
    if (element) {
      const htmlElement = element as HTMLElement
      const rect = htmlElement.getBoundingClientRect()
      const isVisible =
        rect.width > 0 &&
        rect.height > 0 &&
        window.getComputedStyle(htmlElement).display !== "none" &&
        window.getComputedStyle(htmlElement).visibility !== "hidden"

      if (isVisible) {
        console.log(`Meeting active - found visible element: ${selector}`)
        return true
      }
    }
  }
  return false
}

// Initialize connection to background script
function initializePort(): void {
  try {
    if (state.port) {
      state.port.disconnect()
    }

    state.port = chrome.runtime.connect({ name: "meet-bot-port" })

    // Add connection state check
    if (!state.port) {
      throw new Error("Failed to create port connection")
    }

    state.port.onMessage.addListener((message: PortMessage) => {
      switch (message.type) {
        case "STATUS_UPDATE":
          if (message.status) {
            state.status = message.status
            updateInjectedUI()
          }
          break
        case "ERROR":
          console.error("Background error:", message.error)
          state.status = "error"
          updateInjectedUI()
          break
      }
    })

    state.port.onDisconnect.addListener(() => {
      // Log the disconnect reason if available
      if (chrome.runtime.lastError) {
        console.warn("Port disconnected. lastError:", chrome.runtime.lastError.message)
      } else {
        console.log("Port disconnected, attempting to reconnect...")
      }
      state.port = null // Clear the port reference

      if (state.retryCount < MAX_RETRIES) {
        state.retryCount++
        const delay = RETRY_DELAY * state.retryCount
        console.log(`Retrying connection in ${delay}ms (attempt ${state.retryCount}/${MAX_RETRIES})`)
        setTimeout(initializePort, delay)
      } else {
        console.error("Max retries reached for port connection")
        state.status = "error"
        updateInjectedUI()
      }
    })

    // Request initial status only if port is connected
    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError.message)
    }

    state.port.postMessage({ type: "GET_STATUS" })
    state.retryCount = 0 // Reset on successful connection
    console.log("Port connection established successfully")
  } catch (error) {
    console.error("Port connection error:", error)
    state.port = null // Clear the port reference

    if (state.retryCount < MAX_RETRIES) {
      state.retryCount++
      const delay = RETRY_DELAY * state.retryCount
      console.log(`Retrying connection in ${delay}ms (attempt ${state.retryCount}/${MAX_RETRIES})`)
      setTimeout(initializePort, delay)
    } else {
      console.error("Max retries reached for port connection")
      state.status = "error"
      updateInjectedUI()
    }
  }
}

// Find the most appropriate container for injection
function findMeetContainer(): HTMLElement | null {
  console.log("Searching for Meet container...")

  // First try to find a visible container
  for (const selector of MEET_CONTAINER_SELECTORS) {
    const elements = document.querySelectorAll(selector)
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      const htmlElement = element as HTMLElement
      const rect = htmlElement.getBoundingClientRect()
      const isVisible =
        rect.width > 0 &&
        rect.height > 0 &&
        window.getComputedStyle(htmlElement).display !== "none" &&
        window.getComputedStyle(htmlElement).visibility !== "hidden"

      console.log(`Checking container: ${selector}`, {
        tagName: htmlElement.tagName,
        id: htmlElement.id,
        className: htmlElement.className,
        isVisible,
        dimensions: {
          width: rect.width,
          height: rect.height,
        },
        position: {
          top: rect.top,
          left: rect.left,
        },
      })

      if (isVisible) {
        console.log(`Found visible container with selector: ${selector}`)
        return htmlElement
      }
    }
  }

  console.log("No visible container found, falling back to body")
  return document.body
}

// Load styles from the content-styles.css file
async function loadStyles(): Promise<string> {
  try {
    // Try to fetch the CSS file by doing a fetch request to the extension's resources
    const cssURL = chrome.runtime.getURL("content-styles.css")
    const response = await fetch(cssURL)
    return await response.text()
  } catch (error) {
    console.error("Failed to load styles:", error)

    // Return a minimal fallback set of styles if the fetch fails
    return `
      .modern-dark-bg {
        background-color: rgba(32, 33, 36, 0.95);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      }
      .modern-dark-header {
        background: linear-gradient(to right, rgba(32, 33, 36, 0.95), rgba(42, 43, 46, 0.95));
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .modern-dark-card {
        background: rgba(45, 46, 49, 0.8);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        border-radius: 12px;
      }
      .modern-button {
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
        border-radius: 12px;
        font-weight: 500;
        letter-spacing: 0.3px;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px 16px;
      }
      .primary-button {
        background: linear-gradient(135deg, #00c6ae, #00a89e);
        color: #000000;
        box-shadow: 0 4px 12px rgba(0, 198, 174, 0.3);
      }
      .secondary-button {
        background: linear-gradient(135deg, #3c3c3c, #2a2a2a);
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      .status-idle { color: #9ca3af; }
      .status-awaiting { color: #4dabf7; }
      .status-joined { color: #00c6ae; }
      .status-stopped { color: #ff6b6b; }
      .status-icon-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        margin-right: 12px;
      }
      .text-white { color: white; }
      .text-gray-400 { color: #9ca3af; }
      .p-3 { padding: 0.75rem; }
      .p-4 { padding: 1rem; }
      .mt-4 { margin-top: 1rem; }
      .mr-2 { margin-right: 0.5rem; }
      .flex { display: flex; }
      .items-center { align-items: center; }
      .justify-between { justify-content: space-between; }
      .gap-3 { gap: 0.75rem; }
      .text-sm { font-size: 0.875rem; }
      .text-base { font-size: 1rem; }
      .font-medium { font-weight: 500; }
      .font-semibold { font-weight: 600; }
      .rounded-xl { border-radius: 0.75rem; }
      .fade-in { animation: fadeIn 0.5s ease-out forwards; }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .animate-spin { animation: spin 1s linear infinite; }
    `
  }
}

function hasAuthTokens(): boolean {
  try {
    const authTokens = localStorage.getItem('authTokens');
    if (!authTokens) {

      console.log('No auth tokens found in localStorage');
      return false;
    }
    const parsedTokens = JSON.parse(authTokens);
    console.log('Auth tokens found:', parsedTokens);
    return true; 
  } catch (error) {
    console.error('Error checking auth tokens:', error);
    return false;
  }
}

let reactRoot: ReturnType<typeof createRoot> | null = null;
let reactAppRoot: HTMLDivElement | null = null;
let renderPanel: (() => void) | null = null;

const handleAuthSuccess = () => {
  state.isAuthenticated = true;
  if (renderPanel) renderPanel();
};

// Inject the control panel into Google Meet
async function injectControlPanel(): Promise<void> {
  console.log("Checking if meeting is active...")

  // Check if meeting is active
  if (!isMeetingActive()) {
    console.log("Meeting not active yet, skipping injection")
    return
  }

  // Check for auth tokens before rendering
  try {
    const tokensRaw = localStorage.getItem("authTokens");
    if (tokensRaw) {
      try {
        const tokens = JSON.parse(tokensRaw);
        if (tokens && tokens.access && tokens.refresh) {
          state.isAuthenticated = true;
        }
      } catch (e) {
        // Invalid token, ignore
        state.isAuthenticated = false;
      }
    } else {
      state.isAuthenticated = false;
    }
  } catch (e) {
    state.isAuthenticated = false;
  }

  console.log("Meeting is active, attempting to inject control panel...")

  // Check if already injected
  if (document.getElementById(PANEL_ID)) {
    console.log("Control panel already exists, skipping injection")
    return
  }

  const meetContainer = findMeetContainer()
  if (!meetContainer) {
    console.warn("Meet container not found, will retry")
    setTimeout(injectControlPanel, RETRY_DELAY)
    return
  }

  try {
    console.log("Creating panel host element...")
    // Create shadow DOM for better isolation
    const panelHost = document.createElement("div")
    panelHost.id = PANEL_ID

    // Apply positioning styles
    const positionStyles = {
      position: "fixed",
      left: "20px",
      top: "20px",
      zIndex: "999999",
      maxWidth: "400px",
      overflow: "hidden",
      backgroundColor: "transparent",
      border: "none",
      transform: "translateZ(0)",
      pointerEvents: "auto",
    }

    // Apply all styles
    Object.assign(panelHost.style, positionStyles)

    console.log("Creating shadow root...")
    // Create shadow root
    const shadowRoot = panelHost.attachShadow({ mode: "open" })

    // Load and inject the utility CSS
    const utilityCSS = await loadStyles()

    // Create style element
    const style = document.createElement("style")

    // Combine the utility CSS with our component-specific styles
    style.textContent = `
      ${utilityCSS}
      
      :host {
        all: initial;
        font-family: 'Google Sans', 'Segoe UI', Roboto, Arial, sans-serif;
        display: block;
        position: fixed;
        left: 24px;
        top: 24px;
        z-index: 999999;
        max-width: 380px;
        overflow: hidden;
        background: transparent;
        padding: 0;
      }
      * {
        box-sizing: border-box;
      }
    `

    shadowRoot.appendChild(style)

    console.log("Creating mount point...")
    // Create mount point for React
    const appRoot = document.createElement("div")
    appRoot.className = state.isAuthenticated ? "meet-bot-control-panel" : "meet-auth-panel" // Add custom class
    shadowRoot.appendChild(appRoot)

    // Save references for re-rendering
    reactAppRoot = appRoot
    reactRoot = createRoot(appRoot)

    renderPanel = () => {
      if (!reactRoot || !reactAppRoot) return;
      reactAppRoot.className = state.isAuthenticated ? "meet-bot-control-panel" : "meet-auth-panel";
      reactRoot.render(
        <React.StrictMode>
          {state.isAuthenticated ? (
            <MeetControlPanel initialStatus={state.status === "error" ? "stopped" : state.status} />
          ) : (
            <MeetAuthPanel onAuth={handleAuthSuccess} />
          )}
        </React.StrictMode>
      );
    };

    console.log("Adding panel to DOM...")
    // Add to DOM
    meetContainer.appendChild(panelHost)

    console.log("Rendering React component...")
    renderPanel();

    console.log("Control panel injected successfully")
  } catch (error) {
    console.error("Failed to inject control panel:", error)
  }
}

// Update the UI when status changes
function updateInjectedUI(): void {
  const panel = document.getElementById(PANEL_ID)
  if (panel && panel.shadowRoot) {
    const event = new CustomEvent("bot-status-update", {
      detail: { status: state.status },
    })
    panel.dispatchEvent(event)
  }
}

// Setup mutation observer to handle SPA navigation
function setupMutationObserver(): void {
  console.log("Setting up mutation observer...")

  if (state.observer) {
    state.observer.disconnect()
  }

  state.observer = new MutationObserver((mutations) => {
    // Check if meeting is active before attempting injection
    if (isMeetingActive()) {
      if (!document.getElementById(PANEL_ID)) {
        console.log("Meeting active but panel not found, re-injecting...")
        injectControlPanel()
      }
    } else {
      // Remove panel if meeting is not active
      const panel = document.getElementById(PANEL_ID)
      if (panel) {
        console.log("Meeting not active, removing panel...")
        panel.remove()
      }
    }
  })

  state.observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  })

  console.log("Mutation observer setup complete")
}

// Clean up resources
function cleanup(): void {
  if (state.observer) {
    state.observer.disconnect()
    state.observer = null
  }

  if (state.port) {
    state.port.disconnect()
    state.port = null
  }

  const panel = document.getElementById(PANEL_ID)
  if (panel) {
    panel.remove()
  }
}

// Main initialization
function initialize(): void {
  console.log("Initializing Google Meet Bot extension")

  // Initialize port connection
  initializePort()

  // Initial injection attempt
  injectControlPanel()

  // Setup mutation observer for SPA handling
  setupMutationObserver()

  // Cleanup on unload
  window.addEventListener("unload", cleanup)
  window.addEventListener("beforeunload", cleanup)
}

// Start the extension
document.addEventListener("DOMContentLoaded", initialize)

// Also run if DOM is already loaded
if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(initialize, 0)
} else {
  document.addEventListener("DOMContentLoaded", initialize)
}
