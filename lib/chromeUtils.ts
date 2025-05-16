const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

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
      // For development in Next.js without Chrome API
      resolve(window.location.href)
    }
  })
}

export const injectContentScript = async (tabId: number): Promise<void> => {
  if (typeof chrome !== "undefined" && chrome.scripting) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/meet-injector.js']
    });
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content-scripts/content-styles.css', 'content-styles.css']
    });
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
