let botStatus = "idle";
let ports = [];
let isAuthenticated = false;

// Check authentication status
async function checkAuth() {
  try {
    const response = await fetch('http://localhost:8000/auth/check', {
      credentials: 'include'
    });
    isAuthenticated = response.ok;
    return response.ok;
  } catch (error) {
    console.error('Auth check failed:', error);
    isAuthenticated = false;
    return false;
  }
}

// Inject content script from local server
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const script = document.createElement('script');
        script.src = 'http://localhost:8000/content-scripts/meet-injector.js';
        document.head.appendChild(script);
      }
    });
  } catch (error) {
    console.error('Content script injection failed:', error);
  }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('meet.google.com')) {
    const isAuthed = await checkAuth();
    if (isAuthed) {
      await injectContentScript(tabId);
    }
  }
});

// Handle port connections
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "meet-bot-port") {
    ports.push(port);
    
    port.onMessage.addListener(async (msg) => {
      if (msg.type === "GET_STATUS") {
        const isAuthed = await checkAuth();
        if (!isAuthed) {
          port.postMessage({ type: "AUTH_REQUIRED" });
          return;
        }
        port.postMessage({ type: "STATUS_UPDATE", status: botStatus });
      } else if (msg.type === "SET_STATUS") {
        botStatus = msg.status;
        broadcastStatus();
      }
    });

    port.onDisconnect.addListener(() => {
      ports = ports.filter(p => p !== port);
    });
  }
});

function broadcastStatus() {
  ports.forEach(port => {
    port.postMessage({ type: "STATUS_UPDATE", status: botStatus });
  });
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_STATUS") {
    sendResponse({ status: botStatus });
  } else if (message.type === "SET_STATUS") {
    botStatus = message.status;
    broadcastStatus();
    sendResponse({ success: true });
  }
  return true;
});