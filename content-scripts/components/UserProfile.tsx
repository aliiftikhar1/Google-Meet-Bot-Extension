import React, { useEffect, useState } from "react";

const API_BASE_URL = "https://newnotetakerbackend.trylenoxinstruments.com";
const API_ENDPOINT = `${API_BASE_URL}/auth/getmydetails/`;
const PLACEHOLDER_IMG = "https://ui-avatars.com/api/?background=00c6ae&color=fff&name=User";
function getPlaceholderImage(name: string): string {
  return `https://ui-avatars.com/api/?background=00c6ae&color=fff&name=${encodeURIComponent(name)}`;
}

export default function UserProfile() {
  const [user, setUser] = useState<{ full_name: string; email: string; profile_image?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch if not already cached
    const cachedUser = localStorage.getItem("userDetails");
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        if (parsed && parsed.email) {
          setUser(parsed);
          setLoading(false);
          return;
        }
      } catch {}
    }
    // If not cached, fetch from API and cache
    const tokensRaw = localStorage.getItem("extensionTokens");
    if (!tokensRaw) {
      setError("Not logged in");
      setLoading(false);
      return;
    }
    let access = "";
    try {
      access = JSON.parse(tokensRaw).access;
    } catch {
      setError("Invalid token");
      setLoading(false);
      return;
    }
    fetch(API_ENDPOINT, {
      headers: {
        "Authorization": `Bearer ${access}`,
        "Content-Type": "application/json",
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch user details");
        return res.json();
      })
      .then((data) => {
        setUser({ full_name: data.full_name, email: data.email, profile_image: data.profile_image });
        setError(null);
        localStorage.setItem("userDetails", JSON.stringify({ full_name: data.full_name, email: data.email, profile_image: data.profile_image }));
      })
      .catch((err) => {
        setError("Could not load user details");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("extensionTokens");
    localStorage.removeItem("userDetails");
    window.location.reload();
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: 14,
    padding: "1rem 1.2rem",
    color: "#fff",
    fontFamily: "'Google Sans', 'Segoe UI', Roboto, Arial, sans-serif",
    minWidth: 300,
    maxWidth: 450,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  };
  
  const avatarStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid #00c6ae",
    background: "#23272b",
    boxShadow: "0 2px 8px rgba(0,198,174,0.10)",
    flexShrink: 0,
  };
  
  const userInfoStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0, // Allow text to truncate
  };
  
  const nameStyle: React.CSSProperties = {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#00c6ae",
    letterSpacing: 0.1,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  
  const emailStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    color: "#9ca3af",
    fontWeight: 500,
    lineHeight: 1.1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  
  const buttonStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #ff6b6b, #ff8787)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "0.5rem 1rem",
    fontWeight: 600,
    fontSize: "0.875rem",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(255,107,107,0.12)",
    transition: "background 0.2s, box-shadow 0.2s",
    flexShrink: 0,
    whiteSpace: "nowrap",
  };

  if (loading) return <div style={cardStyle}>Loading...</div>;
  if (error) return <div style={cardStyle}>{error}</div>;
  if (!user) return null;

  const profileImg = user.profile_image ? `${API_BASE_URL}${user.profile_image}` : user.full_name?getPlaceholderImage(user.full_name): PLACEHOLDER_IMG;

  return (
    <div style={cardStyle}>
      <img src={profileImg} alt="Profile" style={avatarStyle} />
      <div style={userInfoStyle}>
        <div style={nameStyle}>{user.full_name}</div>
        <div style={emailStyle}>{user.email}</div>
      </div>
      <button style={buttonStyle} onClick={handleLogout}>Logout</button>
    </div>
  );
}