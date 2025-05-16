"use client"

import { useState, useEffect, FormEvent } from "react"
import { getCurrentTab, checkIfGoogleMeet, sendMessageToContentScript } from '../lib/extensionMessaging'
import { injectContentScript, isScriptInjected, getCurrentTabUrl } from '../lib/chromeUtils';
import StatusIndicator from '../components/StatusIndicator';
import ActionButton from '../components/ActionButton';

// Types
type User = { 
  id: number;
  email: string;
  full_name: string;
  phone_number: string | null;
  zip_code: string | null;
  is_verified?: boolean;
}
type Meeting = { url: string; status: string }
type Status = "idle" | "joined" | "awaiting" | "stopped"
type AuthMode = "login" | "signup"
type AuthTokens = {
  access: string;
  refresh: string;
}

type StatusIndicatorProps = { status: Status; isGoogleMeet: boolean }
type ActionButtonProps = {
  onClick: () => void
  disabled?: boolean
  variant?: "primary" | "danger" | string
  isLoading?: boolean
  children: React.ReactNode
}

// API URLs
// const API_BASE_URL = "https://ai-notetaker-backend-fwew.onrender.com";
const API_BASE_URL = "http://localhost:8000";
const API_ENDPOINTS = {
  login: `${API_BASE_URL}/auth/login/`,
  signup: `${API_BASE_URL}/auth/signup/`,
  getUserDetails: `${API_BASE_URL}/auth/getmydetails/`,
  // Add other endpoints as needed for meeting functionality
}

// API response types
type ApiResponse<T> = {
  data?: T;
  message?: string;
  error?: string;
}

// API error handling
const handleApiError = (error: any): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

// Mock data for meetings
const mockMeetings: Meeting[] = [
  { url: "https://meet.google.com/abc-defg-hij", status: "idle" }
];

// Hook to handle Chrome extension functionality
const useChromeExtension = (user: User | null) => {
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [isInjected, setIsInjected] = useState(false);

  useEffect(() => {
    const initializeExtension = async () => {
      if (!user) return;
      try {
        const tab = await getCurrentTab();
        if (!tab || !tab.id) return;
        setCurrentTab(tab);
        const isMeetTab = checkIfGoogleMeet(tab.url || '');
        if (!isMeetTab) return;
        const scriptInjected = await isScriptInjected(tab.id);
        if (!scriptInjected) {
          await injectContentScript(tab.id);
        }
        setIsInjected(true);
      } catch (error) {
        setIsInjected(false);
      }
    };
    initializeExtension();
  }, [user]);

  const updateBotStatus = async (status: Status) => {
    if (!currentTab?.id) return;
    try {
      await sendMessageToContentScript(currentTab.id, {
        type: 'SET_STATUS',
        status: status
      });
    } catch (error) {
      // ignore
    }
  };

  return {
    isInjected,
    updateBotStatus,
    currentTab
  };
};

export default function Popup() {
  // Auth states
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [user, setUser] = useState<User | null>(null);
  const [authTokens, setAuthTokens] = useState<AuthTokens | null>(null);
  // Meeting states
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [isGoogleMeet, setIsGoogleMeet] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>("idle");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const { isInjected, updateBotStatus, currentTab } = useChromeExtension(user);

  // Check current tab and set up message listeners
  useEffect(() => {
    const setupTab = async () => {
      try {
        const tab = await getCurrentTab();
        const url = tab.url || '';
        setCurrentUrl(url);
        setIsGoogleMeet(checkIfGoogleMeet(url));
        if (user && checkIfGoogleMeet(url) && tab.id) {
          const response = await sendMessageToContentScript(tab.id, { type: "GET_STATUS" });
          if (response?.status) setStatus(response.status);
        }
      } catch (err) {}
    };
    setupTab();
    let messageListener: ((message: any) => void) | undefined;
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      messageListener = (message: any) => {
        if (message.type === "STATUS_UPDATE") {
          setStatus(message.status);
        }
      };
      chrome.runtime.onMessage.addListener(messageListener);
    }
    return () => {
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.onMessage &&
        messageListener
      ) {
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    };
  }, [user]);

  // Fetch user details if token exists
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (authTokens?.access) {
        try {
          const response = await fetch(API_ENDPOINTS.getUserDetails, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${authTokens.access}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            setUser(null);
            setAuthTokens(null);
            localStorage.removeItem('authTokens');
          }
        } catch {}
      }
    };
    fetchUserDetails();
  }, [authTokens]);

  // Check for stored auth tokens on component mount
  useEffect(() => {
    const storedTokens = localStorage.getItem('authTokens');
    if (storedTokens) {
      const tokens = JSON.parse(storedTokens);
      setAuthTokens(tokens);
    }
  }, []);

  // Handle login form
  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    try {
      const response = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        const tokens = { access: data.access, refresh: data.refresh };
        setAuthTokens(tokens);
        localStorage.setItem('authTokens', JSON.stringify(tokens));
        setUser(data.user);
        setError(null);
      } else {
        setError(data.message || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError("Network error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle signup form
  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(API_ENDPOINTS.signup, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.message === "Verification email sent. Please verify your account.") {
          setError(null);
          setAuthMode("login");
          alert("Verification email sent. Please verify your account before logging in.");
        } else {
          setUser(data.user);
        }
      } else {
        setError(data.message || "Signup failed. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    setAuthTokens(null);
    setStatus("idle");
    localStorage.removeItem('authTokens');
  };

  // Start the bot
  const startBot = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await updateBotStatus('awaiting');
      setStatus('awaiting');
      setTimeout(async () => {
        await updateBotStatus('joined');
        setStatus('joined');
        setNotes("Meeting started at " + new Date().toLocaleTimeString() + "\n\n" +
                "- John: Welcome everyone to our weekly sync\n" +
                "- Sarah: Let's discuss the project timeline\n" +
                "- Michael: We need to address the pending issues");
      }, 3000);
    } catch (error) {
      setError('Failed to start the bot');
    } finally {
      setIsLoading(false);
    }
  };

  // Stop the bot
  const stopBot = async () => {
    setIsLoading(true);
    try {
      await updateBotStatus('stopped');
      setStatus('stopped');
    } catch (error) {
      setError('Failed to stop the bot');
    } finally {
      setIsLoading(false);
    }
  };

  // Auth UI
  if (!user) {
    return (
      <div className="w-full h-full p-5 bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
        <header className="mb-5 text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-2 rounded-xl shadow-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-sm"
              >
                <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
                <path d="M12 8v1"></path>
                <path d="M12 15v1"></path>
                <path d="M16 12h-1"></path>
                <path d="M9 12H8"></path>
                <path d="M15.7 9.7l-.7.7"></path>
                <path d="M9.7 9.7l-.7-.7"></path>
                <path d="M15.7 14.3l-.7-.7"></path>
                <path d="M9.7 14.3l-.7.7"></path>
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Meet AI Notes Bot
          </h1>
          <p className="text-sm text-gray-500 mt-1">Automated meeting notes for Google Meet</p>
        </header>

        <div className="flex mb-4">
          <button
            className={`flex-1 py-2 transition-colors ${authMode === 'login' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'bg-gray-100 text-gray-500'}`}
            onClick={() => setAuthMode('login')}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 transition-colors ${authMode === 'signup' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'bg-gray-100 text-gray-500'}`}
            onClick={() => setAuthMode('signup')}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm animate-fadeIn">
            {error}
          </div>
        )}

        {authMode === 'login' ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input name="email" type="email" placeholder="Email" required 
              className="border border-gray-300 p-2 rounded-lg" 
              defaultValue="alijanali0091@gmail.com" />
            <input name="password" type="password" placeholder="Password" required 
              className="border border-gray-300 p-2 rounded-lg" 
              defaultValue="Alijan12#" />
            <button 
              type="submit" 
              disabled={isLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg p-2 transition-colors"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
            <p className="text-xs text-center text-gray-500 mt-2">
              Use the provided credentials or create a new account
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="flex flex-col gap-3">
            <input name="email" type="email" placeholder="Email" required 
              className="border border-gray-300 p-2 rounded-lg" />
            <input name="password" type="password" placeholder="Password" required 
              className="border border-gray-300 p-2 rounded-lg" />
            <input name="confirmPassword" type="password" placeholder="Confirm Password" required 
              className="border border-gray-300 p-2 rounded-lg" />
            <button 
              type="submit" 
              disabled={isLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg p-2 transition-colors"
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        )}

        <footer className="mt-auto pt-4 text-center text-xs text-gray-400">
          <p>v1.0.0 • Powered by AI Notes API</p>
        </footer>
      </div>
    );
  }

  // Main UI (when logged in)
  return (
    <div className="w-full h-full p-5 bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <header className="mb-5 text-center">
        <div className="flex items-center justify-center mb-2">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-2 rounded-xl shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-sm"
            >
              <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path>
              <path d="M12 8v1"></path>
              <path d="M12 15v1"></path>
              <path d="M16 12h-1"></path>
              <path d="M9 12H8"></path>
              <path d="M15.7 9.7l-.7.7"></path>
              <path d="M9.7 9.7l-.7-.7"></path>
              <path d="M15.7 14.3l-.7-.7"></path>
              <path d="M9.7 14.3l-.7.7"></path>
            </svg>
          </div>
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Meet AI Notes Bot
        </h1>
        <p className="text-sm text-gray-500 mt-1">Automated meeting notes for Google Meet</p>
        <div className="flex items-center justify-center text-xs text-gray-500 mt-2">
          <span>Logged in as <span className="font-semibold">{user.email}</span></span>
          <button 
            onClick={handleLogout}
            className="ml-2 text-red-500 hover:text-red-700 text-xs"
          >
            Logout
          </button>
        </div>
        {user.is_verified === true && (
          <div className="text-xs text-green-600 mt-1">
            ✓ Account verified
          </div>
        )}
      </header>

      <div className="bg-white rounded-xl shadow-md p-4 mb-5 flex-grow border border-gray-100">
        <StatusIndicator status={status} isGoogleMeet={isGoogleMeet} />
        {isGoogleMeet && isInjected && (
          <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded text-green-700 text-xs">
            ✓ Code injected into Google Meet
          </div>
        )}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm animate-fadeIn">
            {error}
          </div>
        )}
        {!isGoogleMeet && status === "idle" && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 text-sm">
            Please navigate to a Google Meet tab to use this extension.
          </div>
        )}
        {isGoogleMeet && status === "idle" && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-sm">
            <p>✓ Ready to take notes for: {currentUrl}</p>
          </div>
        )}
        {status === "joined" && (
          <>
            <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-sm mb-2">
              Meeting in progress - AI is capturing notes
            </div>
            <div className="bg-gray-50 p-2 rounded-lg text-xs text-gray-700 max-h-24 overflow-y-auto border border-gray-200">
              <pre className="whitespace-pre-wrap font-mono">{notes}</pre>
            </div>
          </>
        )}
        <div className="flex gap-3 justify-center mt-4">
          {status === "idle" && isGoogleMeet && (
            <ActionButton onClick={startBot} isLoading={isLoading} variant="primary">
              Start Bot
            </ActionButton>
          )}
          {status === "joined" && (
            <ActionButton onClick={stopBot} variant="danger" isLoading={isLoading}>
              Stop Bot
            </ActionButton>
          )}
        </div>
      </div>
      <footer className="mt-4 text-center text-xs text-gray-400">
        v1.0.0 • Powered by AI Notes API
      </footer>
    </div>
  );
}
