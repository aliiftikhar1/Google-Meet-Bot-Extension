import React, { FormEvent } from "react";

type AuthMode = "login" | "signup";

interface AuthFormProps {
  authMode: AuthMode;
  isLoading: boolean;
  error: string | null;
  onLogin: (e: FormEvent<HTMLFormElement>) => void;
  onSignup: (e: FormEvent<HTMLFormElement>) => void;
  setAuthMode: (mode: AuthMode) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ authMode, isLoading, error, onLogin, onSignup, setAuthMode }) => (
  <div style={{
    backgroundColor: 'rgba(32, 33, 36, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '20px',
    width: '300px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '20px',
      backgroundColor: 'rgba(42, 43, 46, 0.95)',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <button
        type="button"
        onClick={() => setAuthMode('login')}
        style={{
          flex: 1,
          padding: '10px',
          border: 'none',
          backgroundColor: authMode === 'login' ? 'rgba(0, 198, 174, 0.8)' : 'transparent',
          color: authMode === 'login' ? '#000' : '#fff',
          cursor: 'pointer',
          fontWeight: '500',
          transition: 'all 0.3s ease'
        }}
      >
        Login
      </button>
      <button
        type="button"
        onClick={() => setAuthMode('signup')}
        style={{
          flex: 1,
          padding: '10px',
          border: 'none',
          backgroundColor: authMode === 'signup' ? 'rgba(0, 198, 174, 0.8)' : 'transparent',
          color: authMode === 'signup' ? '#000' : '#fff',
          cursor: 'pointer',
          fontWeight: '500',
          transition: 'all 0.3s ease'
        }}
      >
        Sign Up
      </button>
    </div>
    
    {error && (
      <div style={{
        color: '#ff6b6b',
        backgroundColor: 'rgba(255, 107, 107, 0.15)',
        padding: '10px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        {error}
      </div>
    )}
    
    {authMode === 'login' ? (
      <form onSubmit={onLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          name="email" 
          type="email" 
          placeholder="Email" 
          required 
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(45, 46, 49, 0.8)',
            color: '#fff',
            outline: 'none'
          }}
        />
        <input 
          name="password" 
          type="password" 
          placeholder="Password" 
          required 
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(45, 46, 49, 0.8)',
            color: '#fff',
            outline: 'none'
          }}
        />
        <button 
          type="submit" 
          disabled={isLoading}
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #00c6ae, #00a89e)',
            color: '#000',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '12px',
          textAlign: 'center',
          marginTop: '10px'
        }}>
          Use the provided credentials or create a new account
        </p>
      </form>
    ) : (
      <form onSubmit={onSignup} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          name="full_name" 
          type="text" 
          placeholder="Your Name" 
          required 
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(45, 46, 49, 0.8)',
            color: '#fff',
            outline: 'none'
          }}
        />
        <input 
          name="email" 
          type="email" 
          placeholder="Email" 
          required 
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(45, 46, 49, 0.8)',
            color: '#fff',
            outline: 'none'
          }}
        />
        <input 
          name="password" 
          type="password" 
          placeholder="Password" 
          required 
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(45, 46, 49, 0.8)',
            color: '#fff',
            outline: 'none'
          }}
        />
        <input 
          name="confirmPassword" 
          type="password" 
          placeholder="Confirm Password" 
          required 
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(45, 46, 49, 0.8)',
            color: '#fff',
            outline: 'none'
          }}
        />
        <button 
          type="submit" 
          disabled={isLoading}
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #00c6ae, #00a89e)',
            color: '#000',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
    )}
  </div>
);

export default AuthForm;