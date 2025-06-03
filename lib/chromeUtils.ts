const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getCurrentTabUrl = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message))
        }
        if (tabs.length === 0) {
          return reject(new Error("No active tab found"))
        }
        resolve(tabs[0].url || "")
      })
    } else {
      resolve(window.location.href)
    }
  })
}

export const injectContentScript = async (tabId: number): Promise<void> => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const script = document.createElement('script');
        script.src = 'http://localhost:8000/content-scripts/meet-injector.js';
        document.head.appendChild(script);
        
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = 'http://localhost:8000/content-scripts/content-styles.css';
        document.head.appendChild(style);
      }
    });
  } catch (error) {
    console.error('Failed to inject content script:', error);
    throw error;
  }
};

export const isScriptInjected = async (tabId: number): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
        resolve(!!response);
      });
    } else {
      resolve(false);
    }
  });
};