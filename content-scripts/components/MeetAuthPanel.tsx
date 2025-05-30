import React, { useState, FormEvent, useEffect } from "react";
import AuthForm from "../../components/AuthForm";

// const API_BASE_URL = "https://ai-notetaker-backend-fwew.onrender.com";
const API_BASE_URL = "https://ainotestakerbackend.trylenoxinstruments.com";
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
    <div className="p-4">
      <AuthForm
        authMode={authMode}
        isLoading={isLoading}
        error={error}
        onLogin={handleLogin}
        onSignup={handleSignup}
        setAuthMode={setAuthMode}
      />
    </div>
  );
};

export default MeetAuthPanel;
