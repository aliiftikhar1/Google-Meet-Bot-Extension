import React from "react";

type User = {
  email: string;
  is_verified?: boolean;
};

interface HeaderProps {
  user: User | null;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => (
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
    {user && (
      <div className="flex items-center justify-center text-xs text-gray-500 mt-2">
        <span>Logged in as <span className="font-semibold">{user.email}</span></span>
        {onLogout && (
          <button onClick={onLogout} className="ml-2 text-red-500 hover:text-red-700 text-xs">Logout</button>
        )}
      </div>
    )}
    {user && user.is_verified === true && (
      <div className="text-xs text-green-600 mt-1">✓ Account verified</div>
    )}
  </header>
);

export default Header;
