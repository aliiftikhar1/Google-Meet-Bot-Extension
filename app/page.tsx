"use client"

import { useState, useEffect, FormEvent } from "react"
import { getCurrentTab, checkIfGoogleMeet, sendMessageToContentScript } from '../lib/extensionMessaging'
import { injectContentScript, isScriptInjected, getCurrentTabUrl } from '../lib/chromeUtils';
import AuthForm from '../components/AuthForm';
import Header from '../components/Header';
import MeetingStatusPanel from '../components/MeetingStatusPanel';
import Footer from '../components/Footer';

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
// const API_BASE_URL = "http://localhost:8000";
const API_BASE_URL = "https://ainotestakerbackend.trylenoxinstruments.com";
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
    const full_name = (form.elements.namedItem("full_name") as HTMLInputElement).value;
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
        body: JSON.stringify({ email, password, full_name  }),
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
        <Header user={null} />
        {/* <AuthForm
          authMode={authMode}
          isLoading={isLoading}
          error={error}
          onLogin={handleLogin}
          onSignup={handleSignup}
          setAuthMode={setAuthMode}
        /> */}
        <Footer />
      </div>
    );
  }

  // Main UI (when logged in)
  return (
    <div className="w-full h-full p-5 bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      <Header user={user} onLogout={handleLogout} />
      <MeetingStatusPanel
        status={status}
        isGoogleMeet={isGoogleMeet}
        isInjected={isInjected}
        error={error}
        currentUrl={currentUrl}
        notes={notes}
        isLoading={isLoading}
        onStart={startBot}
        onStop={stopBot}
      />
      <Footer />
    </div>
  );
}
