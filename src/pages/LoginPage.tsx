import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { AnimatedInput, ActionButtons } from '../components/ui-redesign/Forms';
import { TabGroup } from '../components/ui-redesign/Interactive';
import { Chrome, Phone, Mail, UserPlus, LogIn, Lock, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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

  const tabs = [
    { id: 'login', label: 'Login', icon: <LogIn className="w-4 h-4" /> },
    { id: 'register', label: 'Register', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'otp', label: 'OTP Login', icon: <Phone className="w-4 h-4" /> }
  ];

  const handleLogin = async () => {
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

  const handleRegister = async () => {
    if (!registerName || !registerEmail || !registerPassword || !registerPhone || !registerAadhar) {
      toast.error('Please fill all fields');
      return;
    }

    // Validate Aadhar number (must be 12 digits)
    if (registerAadhar.length !== 12) {
      toast.error('Aadhar number must be 12 digits');
      return;
    }

    setIsLoading(true);
    try {
      // Correct parameter order: email, password, name, aadharId, phone, role
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

  const handleSendOTP = async () => {
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

  const handleVerifyOTP = async () => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-6">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* Login Card */}
      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-slate-700/50">
          {/* Logo/Title */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Tarang</h1>
            <p className="text-gray-600 dark:text-gray-300">Hazard Response Platform</p>
          </motion.div>

          {/* Tabs */}
          <TabGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* Forms */}
          <AnimatePresence mode="wait">
            {activeTab === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <AnimatedInput
                  label="Email"
                  type="email"
                  value={loginEmail}
                  onChange={setLoginEmail}
                  placeholder="your@email.com"
                  icon={<Mail className="w-4 h-4" />}
                  required
                />
                <AnimatedInput
                  label="Password"
                  type="password"
                  value={loginPassword}
                  onChange={setLoginPassword}
                  placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  required
                />
                <ActionButtons
                  onSubmit={handleLogin}
                  submitLabel="Login"
                  isSubmitting={isLoading}
                />

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400">Or continue with</span>
                  </div>
                </div>

                <motion.button
                  onClick={handleGoogleLogin}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading}
                >
                  <Chrome className="w-5 h-5" />
                  Sign in with Google
                </motion.button>
              </motion.div>
            )}

            {activeTab === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <AnimatedInput
                  label="Full Name"
                  value={registerName}
                  onChange={setRegisterName}
                  placeholder="John Doe"
                  required
                />
                <AnimatedInput
                  label="Email"
                  type="email"
                  value={registerEmail}
                  onChange={setRegisterEmail}
                  placeholder="your@email.com"
                  icon={<Mail className="w-4 h-4" />}
                  required
                />
                <AnimatedInput
                  label="Phone"
                  type="tel"
                  value={registerPhone}
                  onChange={setRegisterPhone}
                  placeholder="+91 1234567890"
                  icon={<Phone className="w-4 h-4" />}
                  required
                />
                <AnimatedInput
                  label="Aadhar Number"
                  type="text"
                  value={registerAadhar}
                  onChange={(value) => {
                    // Only allow numbers and limit to 12 digits
                    const cleaned = value.replace(/\D/g, '').slice(0, 12);
                    setRegisterAadhar(cleaned);
                  }}
                  placeholder="1234 5678 9012"
                  icon={<CreditCard className="w-4 h-4" />}
                  required
                />
                <AnimatedInput
                  label="Password"
                  type="password"
                  value={registerPassword}
                  onChange={setRegisterPassword}
                  placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  required
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                  <select
                    value={registerRole}
                    onChange={(e) => setRegisterRole(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white"
                  >
                    <option value="citizen">Citizen</option>
                    <option value="authority">Authority</option>
                    <option value="responder">Responder</option>
                    <option value="ngo">NGO</option>
                  </select>
                </div>
                <ActionButtons
                  onSubmit={handleRegister}
                  submitLabel="Register"
                  isSubmitting={isLoading}
                />
              </motion.div>
            )}

            {activeTab === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {!otpSent ? (
                  <>
                    <AnimatedInput
                      label="Phone Number"
                      type="tel"
                      value={otpPhone}
                      onChange={setOtpPhone}
                      placeholder="+91 1234567890"
                      icon={<Phone className="w-4 h-4" />}
                      required
                    />
                    <ActionButtons
                      onSubmit={handleSendOTP}
                      submitLabel="Send OTP"
                      isSubmitting={isLoading}
                    />
                  </>
                ) : (
                  <>
                    <AnimatedInput
                      label="Enter OTP"
                      value={otpCode}
                      onChange={setOtpCode}
                      placeholder="123456"
                      required
                    />
                    <ActionButtons
                      onSubmit={handleVerifyOTP}
                      submitLabel="Verify OTP"
                      isSubmitting={isLoading}
                      onCancel={() => {
                        setOtpSent(false);
                        setOtpCode('');
                      }}
                      cancelLabel="Resend"
                    />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
