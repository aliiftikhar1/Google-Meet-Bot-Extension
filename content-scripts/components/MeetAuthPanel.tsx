import React, { useState, FormEvent, useEffect, useRef } from "react";
import AuthForm from "../../components/AuthForm";

// const API_BASE_URL = "https://ai-notetaker-backend-fwew.onrender.com";
const API_BASE_URL = "https://newnotetakerbackend.trylenoxinstruments.com";
const API_ENDPOINTS = {
  login: `${API_BASE_URL}/auth/login/`,
  signup: `${API_BASE_URL}/auth/signup/`,
  getUserDetails: `${API_BASE_URL}/auth/getmydetails/`,
};

type User = {
  id: number;
  email: string;
  full_name: string;
  phone_number: string | null;
  zip_code: string | null;
  profile_image?: string;
  is_verified?: boolean;
};
type AuthMode = "login" | "signup";
type extensionTokens = { access: string; refresh: string };

const MeetAuthPanel: React.FC<{ onAuth: (user: User, tokens: extensionTokens) => void }> = ({ onAuth }) => {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-collapse timer on initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExpanded(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Handle hover events for auto-collapse
  const startCollapseTimer = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }

    // Set new timer
    collapseTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 5000);
  };

  const clearCollapseTimer = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  // Auto-login if tokens exist in localStorage
  useEffect(() => {
    const tokensRaw = localStorage.getItem("extensionTokens");
    if (tokensRaw) {
      try {
        const tokens = JSON.parse(tokensRaw);
        // Optionally, you could fetch user details here using tokens.access
        // For now, just call onAuth with a dummy user (or fetch real user if needed)
        onAuth({
          id: 0,
          email: "",
          full_name: "",
          phone_number: null,
          zip_code: null,
          profile_image: "",
        }, tokens);
      } catch (e) {
        // Invalid token, ignore
      }
    }
  }, [onAuth]);

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
        localStorage.setItem("extensionTokens", JSON.stringify({ access: data.access, refresh: data.refresh }));
        onAuth(data.user, { access: data.access, refresh: data.refresh });
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
        body: JSON.stringify({ email, password, full_name }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.message === "Verification email sent. Please verify your account.") {
          setError(null);
          setAuthMode("login");
          alert("Verification email sent. Please verify your account before logging in.");
        } else {
          localStorage.setItem("extensionTokens", JSON.stringify({ access: data.access, refresh: data.refresh }));
          onAuth(data.user, { access: data.access, refresh: data.refresh });
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

  return (
    <div
      ref={panelRef}
      style={{ overflow: "hidden" }}
      className={`modern-dark-bg transition-all duration-500 ease-in-out overflow-hidden rounded-xl ${
        isExpanded ? "w-full" : "w-12 h-12"
      }`}
      onMouseEnter={() => {
        clearCollapseTimer();
        if (!isExpanded) {
          setIsExpanded(true);
        }
      }}
      onMouseLeave={() => {
        if (isExpanded) {
          startCollapseTimer();
        }
      }}
    >
      <div className="flex items-center justify-between p-3 modern-dark-header">
        <div className="flex items-center">
          {!isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="transition-all flex items-center justify-center"
              style={{
                padding: "0",
                width: "32px",
                height: "32px",
                background: "transparent",
                outline: "none",
                boxShadow: "none",
                borderRadius: "50%",
                overflow: "hidden"
              }}
            >
              <img
                src="https://static.vecteezy.com/system/resources/thumbnails/007/225/199/small_2x/robot-chat-bot-concept-illustration-vector.jpg"
                alt="Expand"
                style={{
                  objectFit: "cover",
                  width: "100%",
                  height: "100%",
                  boxShadow: "none",
                  borderRadius: "0"
                }}
                className="text-white"
              />
            </button>
          )}
        </div>
        {isExpanded && (
          <button
            onClick={() => setIsExpanded(false)}
            className="transition-all flex items-center justify-center"
            style={{
              padding: "0",
              width: "32px",
              height: "32px",
              background: "transparent",
              outline: "none",
              boxShadow: "none",
              borderRadius: "50%",
              overflow: "hidden"
            }}
          >
            <img
              src="https://static.vecteezy.com/system/resources/thumbnails/007/225/199/small_2x/robot-chat-bot-concept-illustration-vector.jpg"
              alt="Collapse"
              style={{
                objectFit: "cover",
                width: "100%",
                height: "100%",
                boxShadow: "none",
                borderRadius: "0"
              }}
              className="text-white"
            />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className=" fade-in">
          <AuthForm
            authMode={authMode}
            isLoading={isLoading}
            error={error}
            onLogin={handleLogin}
            onSignup={handleSignup}
            setAuthMode={setAuthMode}
          />
        </div>
      )}
    </div>
  );
};

export default MeetAuthPanel;
