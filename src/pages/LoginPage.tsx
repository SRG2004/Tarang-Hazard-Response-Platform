
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import { AnimatedInput, ActionButtons } from '../components/ui-redesign/Forms';
import { TabGroup } from '../components/ui-redesign/Interactive';
import { Chrome, Phone, Mail, UserPlus, LogIn, Lock, CreditCard, User } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, sendOTP, verifyOTP } = useAuth();
  const { t } = useTranslation();
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
    { id: 'login', label: t('login.login'), icon: LogIn },
    { id: 'register', label: t('login.register'), icon: UserPlus },
    { id: 'otp', label: t('login.otpLogin'), icon: Phone }
  ];

  /* Handlers (omitted for brevity in comments, kept logic same) */
  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      toast.error(t('login.fillAllFields'));
      return;
    }
    setIsLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success(t('login.loginSuccess'));
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || t('login.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerName || !registerEmail || !registerPassword || !registerPhone || !registerAadhar) {
      toast.error(t('login.fillAllFields'));
      return;
    }
    if (registerAadhar.length !== 12) {
      toast.error(t('login.aadharMustBe12'));
      return;
    }
    setIsLoading(true);
    try {
      await register(registerEmail, registerPassword, registerName, registerAadhar, registerPhone, registerRole as any);
      toast.success(t('login.registrationSuccess'));
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || t('login.registrationFailed'));
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
      // Silent fail or toast
      if (error.code !== 'auth/popup-closed-by-user') {
        toast.error(error.message || 'Google login failed');
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
      // Create a temporary recaptcha verifier if needed, 
      // or assume the AuthContext handles the default one if not provided (check AuthContext logic)
      // Actually, AuthContext.sendOTP requires a recaptchaVerifier argument.
      const { RecaptchaVerifier } = await import('firebase/auth');
      const { auth } = await import('../lib/firebase');

      const recaptchaVerifier = new RecaptchaVerifier(auth, 'login-container', {
        size: 'invisible'
      });

      const confirmation = await sendOTP(otpPhone, recaptchaVerifier);
      // @ts-ignore - storing confirmation in state for verify
      window.confirmationResult = confirmation;
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
      // @ts-ignore
      const confirmation = window.confirmationResult;
      if (!confirmation) throw new Error('No confirmation result found');

      await verifyOTP(confirmation, otpCode);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 md:p-6 bg-transparent relative overflow-x-hidden">
      {/* 
        Key changes for smooth animation:
        1. Remove activeTab from className width logic to allow layout prop to handle it 
        2. OR use explicit width animation
        3. Remove 'relative' to allow absolute positioning of children during transition if needed, 
           BUT for container resize 'layout' is best.
        
        The flicker happens usually because Framer removes the element before the new one is ready.
        We will use a single motion.div wrapper that animates its width.
      */}
      <motion.div
        layout
        id="login-container"
        initial={false}
        animate={{
          width: '100%',
          maxWidth: (activeTab === 'register' || activeTab === 'login') ? '56rem' : '28rem' // 56rem (4xl) for form+demo or register
        }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="relative z-10 w-full"
      >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-slate-700/50 overflow-hidden">

          <motion.div className="text-center mb-8" layout="position">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('login.welcomeToTarang')}</h1>
            <p className="text-gray-600 dark:text-gray-300">{t('login.subtitle')}</p>
          </motion.div>

          {/* Pass layout prop to TabGroup if it supports it, otherwise wrap it */}
          <motion.div layout="position" className="mb-6">
            <TabGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          </motion.div>

          {/* 
            Use AnimatePresence with mode='wait' BUT fast transition 
            We need to ensure the container height adjusts smoothly. 
          */}
          <motion.div layout className="overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {activeTab === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  {/* Left Column: Login Form */}
                  <div className="space-y-4">
                    <AnimatedInput
                      label={t('login.email')}
                      type="email"
                      value={loginEmail}
                      onChange={setLoginEmail}
                      placeholder={t('login.emailPlaceholder')}
                      icon={<Mail className="w-4 h-4" />}
                      required
                    />
                    <AnimatedInput
                      label={t('login.password')}
                      type="password"
                      value={loginPassword}
                      onChange={setLoginPassword}
                      placeholder="••••••••"
                      icon={<Lock className="w-4 h-4" />}
                      required
                    />
                    <ActionButtons onSubmit={handleLogin} submitLabel={t('login.login')} isSubmitting={isLoading} />

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-700"></div></div>
                      <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-slate-900 text-gray-500">{t('login.orContinue')}</span></div>
                    </div>

                    <motion.button
                      onClick={handleGoogleLogin}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Chrome className="w-5 h-5" /> {t('login.signInWithGoogle')}
                    </motion.button>
                  </div>

                  {/* Right Column: Demo Access */}
                  <div className="space-y-4 md:border-l md:border-gray-200 md:dark:border-gray-700 md:pl-8 flex flex-col justify-center">
                    <div className="mb-2 text-center md:text-left">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">Demo Access</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        Quickly explore the platform using these pre-configured role accounts.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { role: 'citizen', label: 'Citizen', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200' },
                        { role: 'authority', label: 'Authority', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200' },
                        { role: 'responder', label: 'Responder', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200' },
                        { role: 'ngo', label: 'NGO', color: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200' }
                      ].map((item) => (
                        <button
                          key={item.role}
                          onClick={() => {
                            setLoginEmail(`${item.role}@gmail.com`);
                            setLoginPassword('password');
                            toast.info(`Filled ${item.label} credentials`);
                          }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] ${item.color}`}
                        >
                          <span className="font-semibold text-sm">{item.label}</span>
                          <span className="text-[10px] opacity-70 mt-1">Click to fill</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'register' && (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {/* Left Column */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Personal Details</h3>
                    <AnimatedInput
                      label="Full Name"
                      value={registerName}
                      onChange={setRegisterName}
                      placeholder="John Doe"
                      icon={<User className="w-4 h-4" />}
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
                      placeholder="+91..."
                      icon={<Phone className="w-4 h-4" />}
                      required
                    />
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Security & Role</h3>
                    <AnimatedInput
                      label="Aadhar Number"
                      value={registerAadhar}
                      onChange={(val) => setRegisterAadhar(val.replace(/\D/g, '').slice(0, 12))}
                      placeholder="12-digit ID"
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
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                      <select
                        value={registerRole}
                        onChange={(e) => setRegisterRole(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      >
                        <option value="citizen">Citizen</option>
                        <option value="authority">Authority</option>
                        <option value="responder">Responder</option>
                        <option value="ngo">NGO</option>
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-2">
                    <ActionButtons onSubmit={handleRegister} submitLabel="Create Account" isSubmitting={isLoading} />
                  </div>
                </motion.div>
              )}

              {activeTab === 'otp' && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 max-w-md mx-auto"
                >
                  {!otpSent ? (
                    <>
                      <AnimatedInput label="Phone Number" value={otpPhone} onChange={setOtpPhone} placeholder="+91..." icon={<Phone className="w-4 h-4" />} />
                      <ActionButtons onSubmit={handleSendOTP} submitLabel="Send OTP" isSubmitting={isLoading} />
                    </>
                  ) : (
                    <>
                      <AnimatedInput label="Enter OTP" value={otpCode} onChange={setOtpCode} placeholder="123456" />
                      <ActionButtons onSubmit={handleVerifyOTP} submitLabel="Verify & Login" isSubmitting={isLoading} onCancel={() => { setOtpSent(false); setOtpCode('') }} cancelLabel="Back" />
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>
      </motion.div >
    </div >
  );
}
