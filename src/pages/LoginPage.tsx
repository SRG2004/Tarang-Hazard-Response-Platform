
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { AnimatedInput, ActionButtons } from '../components/ui-redesign/Forms';
import { TabGroup } from '../components/ui-redesign/Interactive';
import { Chrome, Phone, Mail, UserPlus, LogIn, Lock, CreditCard, User } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { SmokeyBackground } from '../components/ui/login-form';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, sendOTP, verifyOTP } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [isLoading, setIsLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerAadhar, setRegisterAadhar] = useState('');
  const [registerRole, setRegisterRole] = useState('citizen');

  // OTP state
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Tabs configuration (matching previous logic)
  const tabs = [
    { id: 'login', label: 'Login', icon: <LogIn className="w-4 h-4" /> },
    { id: 'register', label: 'Register', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'otp', label: 'OTP Login', icon: <Phone className="w-4 h-4" /> }
  ];

  /* -------------------------------
     Auth Handlers (Preserved Logic)
     ------------------------------- */
  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Please fill all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!registerName || !registerEmail || !registerPassword || !registerPhone || !registerAadhar) {
      toast.error('Please fill all fields');
      return;
    }
    if (registerAadhar.length !== 12) {
      toast.error('Aadhar number must be 12 digits');
      return;
    }

    setIsLoading(true);
    try {
      await register(registerEmail, registerPassword, registerName, registerAadhar, registerPhone, registerRole as any);
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in cancelled. Please try again.');
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized. Please check Firebase Console.');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Popup blocked. Please enable popups for this site.');
      } else {
        toast.error(error.message || 'Google login failed');
        console.error("Google verify error:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!otpPhone) {
      toast.error('Please enter phone number');
      return;
    }

    setIsLoading(true);
    try {
      await sendOTP(otpPhone);
      setOtpSent(true);
      toast.success('OTP sent successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!otpCode) {
      toast.error('Please enter OTP');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP(otpCode);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  /* -------------------------------
     New Glassmorphism UI
     ------------------------------- */
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-900 flex items-center justify-center p-4">
      {/* 1. Smokey WebGL Background */}
      <SmokeyBackground className="absolute inset-0 z-0" color="#312e81" backdropBlurAmount="sm" />

      {/* 2. Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-md p-8 space-y-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl animate-fade-in-up">

        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-1">Welcome to Tarang</h2>
          <p className="text-sm text-gray-300">Hazard Response Platform</p>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1 space-x-1 bg-black/20 rounded-xl relative">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                   w-full py-2.5 text-sm font-medium leading-5 rounded-lg focus:outline-none transition-all duration-200
                   flex items-center justify-center gap-2
                   ${isActive
                    ? 'bg-white text-indigo-700 shadow'
                    : 'text-gray-300 hover:bg-white/[0.12] hover:text-white'}
                 `}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-6 mt-4">
                <FloatingInput
                  id="login-email"
                  type="email"
                  label="Email Address"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  icon={<User size={16} />}
                />
                <FloatingInput
                  id="login-password"
                  type="password"
                  label="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  icon={<Lock size={16} />}
                />

                <div className="flex items-center justify-between text-xs">
                  <a href="#" className="text-gray-300 hover:text-white transition">Forgot Password?</a>
                </div>

                <SubmitButton isLoading={isLoading} label="Sign In" />

                <GoogleLoginButton onClick={handleGoogleLogin} isLoading={isLoading} />
              </form>
            )}

            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4 mt-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <FloatingInput
                  id="reg-name"
                  type="text"
                  label="Full Name"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  icon={<User size={16} />}
                />
                <FloatingInput
                  id="reg-email"
                  type="email"
                  label="Email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  icon={<Mail size={16} />}
                />
                <FloatingInput
                  id="reg-phone"
                  type="tel"
                  label="Phone"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  icon={<Phone size={16} />}
                />
                <FloatingInput
                  id="reg-aadhar"
                  type="text"
                  label="Aadhar (12 digits)"
                  value={registerAadhar}
                  onChange={(e) => setRegisterAadhar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  icon={<CreditCard size={16} />}
                />
                <FloatingInput
                  id="reg-password"
                  type="password"
                  label="Password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  icon={<Lock size={16} />}
                />

                <div className="relative z-0">
                  <select
                    value={registerRole}
                    onChange={(e) => setRegisterRole(e.target.value)}
                    className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-500 peer"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="citizen" className="bg-slate-900 text-white">Citizen</option>
                    <option value="authority" className="bg-slate-900 text-white">Authority</option>
                    <option value="responder" className="bg-slate-900 text-white">Responder</option>
                    <option value="ngo" className="bg-slate-900 text-white">NGO</option>
                  </select>
                  <label className="absolute text-sm text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0]">
                    Role
                  </label>
                </div>

                <SubmitButton isLoading={isLoading} label="Register" />
              </form>
            )}

            {activeTab === 'otp' && (
              <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} className="space-y-6 mt-4">
                {!otpSent ? (
                  <FloatingInput
                    id="otp-phone"
                    type="tel"
                    label="Phone Number"
                    value={otpPhone}
                    onChange={(e) => setOtpPhone(e.target.value)}
                    icon={<Phone size={16} />}
                  />
                ) : (
                  <FloatingInput
                    id="otp-code"
                    type="text"
                    label="Enter OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    icon={<Lock size={16} />}
                  />
                )}

                <SubmitButton
                  isLoading={isLoading}
                  label={otpSent ? "Verify OTP" : "Send OTP"}
                />

                {otpSent && (
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="w-full mt-2 text-sm text-gray-300 hover:text-white"
                  >
                    Change Phone Number
                  </button>
                )}
              </form>
            )}

          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Internal UI Sub-components (for cleaner main component)
// ----------------------------------------------------------------------

// Custom helper for autofill transparency
const customStyles = `
  input:-webkit-autofill,
  input:-webkit-autofill:hover, 
  input:-webkit-autofill:focus, 
  input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px #1a1a1a inset !important;
    -webkit-text-fill-color: white !important;
    transition: background-color 5000s ease-in-out 0s;
  }
`;

function FloatingInput({ id, type, label, value, onChange, icon }: any) {
  return (
    <div className="relative z-0 w-full group">
      <style>{customStyles}</style>
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-500 peer"
        placeholder=" "
        required
      />
      <label
        htmlFor={id}
        className="absolute text-sm text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-blue-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 flex items-center gap-2"
      >
        {icon}
        {label}
      </label>
    </div>
  );
}

function SubmitButton({ isLoading, label }: { isLoading: boolean, label: string }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="group w-full flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <>
          {label}
          {/* Arrow icon removed or conditional if needed */}
        </>
      )}
    </button>
  );
}

function GoogleLoginButton({ onClick, isLoading }: { onClick: () => void, isLoading: boolean }) {
  return (
    <>
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-gray-400/30"></div>
        <span className="flex-shrink mx-4 text-gray-400 text-xs">OR CONTINUE WITH</span>
        <div className="flex-grow border-t border-gray-400/30"></div>
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className="w-full flex items-center justify-center py-2.5 px-4 bg-white/90 hover:bg-white rounded-lg text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-300"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.841C34.553 4.806 29.613 2.5 24 2.5C11.983 2.5 2.5 11.983 2.5 24s9.483 21.5 21.5 21.5S45.5 36.017 45.5 24c0-1.538-.135-3.022-.389-4.417z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12.5 24 12.5c3.059 0 5.842 1.154 7.961 3.039l5.839-5.841C34.553 4.806 29.613 2.5 24 2.5C16.318 2.5 9.642 6.723 6.306 14.691z"></path><path fill="#4CAF50" d="M24 45.5c5.613 0 10.553-2.306 14.802-6.341l-5.839-5.841C30.842 35.846 27.059 38 24 38c-5.039 0-9.345-2.608-11.124-6.481l-6.571 4.819C9.642 41.277 16.318 45.5 24 45.5z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l5.839 5.841C44.196 35.123 45.5 29.837 45.5 24c0-1.538-.135-3.022-.389-4.417z"></path>
        </svg>
        Sign in with Google
      </button>
    </>
  );
}
