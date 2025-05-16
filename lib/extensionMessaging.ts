// Chrome Extension messaging utilities

type BotStatus = "idle" | "awaiting" | "joined" | "stopped"

type ExtensionMessage = {
  type: string;
  status?: BotStatus;
  error?: string;
  data?: any;
}

type MessageResponse = {
  status?: BotStatus;
  success?: boolean;
  error?: string;
}

export const sendMessageToContentScript = async (tabId: number, message: ExtensionMessage): Promise<MessageResponse> => {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
};

export const sendMessageToBackground = async (message: any) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
};

export const getCurrentTab = async () => {
  const queryOptions = { active: true, currentWindow: true };
  const [tab] = await chrome.tabs.query(queryOptions);
  return tab;
};

export const checkIfGoogleMeet = (url: string | undefined) => {
  return url?.includes('meet.google.com') || false;
};
