import React, { useState, useEffect, useRef } from 'react';
import { validateAadhar } from '../utils/aadharValidation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Phone, Lock, CheckCircle, Loader2 } from 'lucide-react';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTranslation } from '../contexts/TranslationContext';
import { useAuth } from '../contexts/AuthContext';

interface GoogleSignupCompletionProps {
  open: boolean;
  onClose: () => void;
  onComplete: (aadharId: string) => void;
  userName: string;
  userEmail: string;
  onSendOTP: (phone: string, verifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  onVerifyOTP: (confirmationResult: ConfirmationResult, otp: string) => Promise<void>;
  onSetPassword: (password: string, aadharId: string) => Promise<void>;
  onUpdatePhone: (phone: string) => Promise<void>;
}

export function GoogleSignupCompletion({
  open,
  onClose,
  onComplete,
  userName,
  userEmail,
  onSendOTP,
  onVerifyOTP,
  onSetPassword,
  onUpdatePhone,
}: GoogleSignupCompletionProps) {
  const { t } = useTranslation();
  const { checkAadharAvailability } = useAuth();
  const [step, setStep] = useState<'aadhar' | 'phone' | 'verify-otp' | 'password'>('aadhar');
  const [aadharId, setAadharId] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [isRecaptchaReady, setIsRecaptchaReady] = useState(false);
  const [isRecaptchaVerified, setIsRecaptchaVerified] = useState(false);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    // Initialize reCAPTCHA when dialog is open and we are in phone step (or if it was already initialized)
    if (open && step === 'phone' && phone.length === 10 && !phoneVerified && !recaptchaVerifierRef.current) {
      setupRecaptcha();
    }

    // Cleanup only when dialog closes
    return () => {
      if (!open && recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
          setIsRecaptchaReady(false);
          setIsRecaptchaVerified(false);
          const container = document.getElementById('google-recaptcha-container');
          if (container) {
            container.innerHTML = '';
          }
        } catch (e) {
          console.warn('Error cleaning up reCAPTCHA:', e);
        }
      }
    };
  }, [open, step, phone, phoneVerified]);

  const setupRecaptcha = async () => {
    try {
      if (recaptchaVerifierRef.current) {
        setIsRecaptchaReady(true);
        return recaptchaVerifierRef.current;
      }

      const container = document.getElementById('google-recaptcha-container');
      if (!container) {
        console.error('reCAPTCHA container not found');
        return;
      }

      container.innerHTML = '';

      const verifier = new RecaptchaVerifier(auth, 'google-recaptcha-container', {
        size: 'normal',
        callback: () => {
          console.log('reCAPTCHA verified');
          setIsRecaptchaVerified(true);
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          toast.error(t('googleSignup.recaptchaExpired'));
          setIsRecaptchaVerified(false);
          // Don't clear the verifier on expiry, just reset verification state
          // The user can click the checkbox again
        },
      });

      await verifier.render();
      recaptchaVerifierRef.current = verifier;
      setIsRecaptchaReady(true);
      console.log('reCAPTCHA setup complete');
    } catch (error: any) {
      console.error('Error setting up reCAPTCHA:', error);
      toast.error(t('googleSignup.recaptchaSetupFailed'));
      setIsRecaptchaReady(false);
      setIsRecaptchaVerified(false);
    }
  };

  const handleCheckAadhar = async () => {
    if (!aadharId || !validateAadhar(aadharId)) {
      toast.error('Please enter a valid 12-digit Aadhar ID');
      return;
    }

    setIsLoading(true);
    try {
      const isAvailable = await checkAadharAvailability(aadharId);
      if (!isAvailable) {
        toast.error('This Aadhar ID is already registered with another account.');
        return;
      }
      setStep('phone');
    } catch (error) {
      console.error('Error checking Aadhar:', error);
      toast.error('Failed to verify Aadhar ID availability');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    console.log('handleSendOTP called');
    if (phone.length !== 10) {
      toast.error(t('login.invalidPhone'));
      return;
    }

    if (!isRecaptchaVerified) {
      toast.error('Please complete the captcha verification first');
      return;
    }

    if (!recaptchaVerifierRef.current) {
      console.log('reCAPTCHA verifier not ready, attempting setup...');
      await setupRecaptcha();
      if (!recaptchaVerifierRef.current) {
        console.error('reCAPTCHA setup failed during send OTP');
        toast.error(t('googleSignup.recaptchaNotReady'));
        return;
      }
    }

    setIsLoading(true);
    try {
      console.log('Sending OTP to:', phone);
      const result = await onSendOTP(phone, recaptchaVerifierRef.current);
      console.log('OTP sent successfully');
      confirmationResultRef.current = result;
      setStep('verify-otp');
      toast.success(t('login.otpSentSuccess'));
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Failed to send OTP');
      // If error is related to captcha, reset verification
      if (error.code === 'auth/invalid-app-credential' || error.code === 'auth/captcha-check-failed') {
        setIsRecaptchaVerified(false);
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
          setIsRecaptchaReady(false);
          setupRecaptcha();
        }
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many requests. Please wait a while before trying again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error(t('login.invalidOTP'));
      return;
    }

    if (!confirmationResultRef.current) {
      toast.error(t('login.requestOTPFirst'));
      return;
    }

    setIsLoading(true);
    try {
      await onVerifyOTP(confirmationResultRef.current, otpCode);
      setPhoneVerified(true);
      await onUpdatePhone(phone);
      toast.success(t('login.phoneVerifiedSimple'));

      // Move to password step
      setStep('password');
      setOtpCode('');

      // Clean up reCAPTCHA
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Failed to verify OTP');
      setOtpCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!password || password.length < 6) {
      toast.error(t('googleSignup.passwordMinLength'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('googleSignup.passwordsNotMatch'));
      return;
    }

    if (!aadharId || !/^\d{12}$/.test(aadharId.replace(/\s/g, ''))) {
      toast.error('Please enter a valid 12-digit Aadhar ID');
      return;
    }

    setIsLoading(true);
    try {
      await onSetPassword(password, aadharId.replace(/\s/g, ''));
      toast.success(t('googleSignup.passwordSetSuccess'));

      // Complete the flow
      setTimeout(() => {
        onComplete(aadharId.replace(/\s/g, ''));
      }, 1000);
    } catch (error: any) {
      console.error('Error setting password:', error);
      toast.error(error.message || 'Failed to set password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipPassword = () => {
    if (!aadharId || !/^\d{12}$/.test(aadharId.replace(/\s/g, ''))) {
      toast.error('Please enter a valid 12-digit Aadhar ID');
      return;
    }
    toast.info(t('googleSignup.skipPasswordHint'));
    onComplete(aadharId.replace(/\s/g, ''));
  };

  return (
    <Dialog open={open} onOpenChange={(val: boolean) => {
      // Prevent closing if not complete
      if (!val && (!phoneVerified || !aadharId)) {
        toast.warning('Please complete your profile to continue.');
        return;
      }
      onClose();
    }}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e: any) => e.preventDefault()} onEscapeKeyDown={(e: any) => e.preventDefault()}>
        {/* Removed inline style hack for reCAPTCHA z-index. The default behavior should work if the Dialog is properly managed. */}
        <DialogHeader>
          <DialogTitle>{t('googleSignup.title')}</DialogTitle>
          <DialogDescription>
            {t('googleSignup.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Step 1: Aadhar ID */}
          {step === 'aadhar' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('googleSignup.name')}</Label>
                <Input id="name" value={userName} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.email')}</Label>
                <Input id="email" type="email" value={userEmail} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aadharId" className="text-sm font-medium">
                  <span>{t('login.aadharId') || 'Aadhar ID'}</span>
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="aadharId"
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012"
                  value={aadharId}
                  onChange={(e) => {
                    // Allow only digits and spaces, format as XXXX XXXX XXXX
                    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                    setAadharId(formatted);
                  }}
                  required
                  maxLength={14}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  {t('login.aadharHint') || 'Enter your 12-digit Aadhar number. This will be used as your unique identifier.'}
                </p>
              </div>
              <Button
                onClick={handleCheckAadhar}
                disabled={!aadharId || !/^\d{12}$/.test(aadharId.replace(/\s/g, '')) || isLoading}
                className="w-full"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Phone Number */}
          {step === 'phone' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('googleSignup.name')}</Label>
                <Input id="name" value={userName} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.email')}</Label>
                <Input id="email" type="email" value={userEmail} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  {t('login.phoneNumber')} <span className="text-red-500">*</span>
                </Label>
                <div className="flex space-x-2">
                  <div className="flex items-center justify-center px-3 border border-input rounded-md bg-muted text-sm h-9 min-w-14">
                    +91
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 10) {
                        setPhone(value);
                      }
                    }}
                    maxLength={10}
                    className="flex-1"
                    autoComplete="tel-national"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('googleSignup.phoneHint')}
                </p>
              </div>

              {/* Always render reCAPTCHA container, but hide it when not needed */}
              <div className={`mt-4 flex justify-center ${step !== 'phone' ? 'hidden' : ''}`}>
                <div id="google-recaptcha-container"></div>
              </div>

              <Button
                onClick={handleSendOTP}
                disabled={isLoading || phone.length !== 10 || !isRecaptchaVerified}
                className="w-full"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
                {isRecaptchaVerified ? t('login.sendOTP') : 'Please Complete Captcha'}
              </Button>
            </div>
          )}

          {/* Step 2: Verify OTP */}
          {step === 'verify-otp' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{t('googleSignup.otpSent', { phone: `+91 ${phone}` })}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">{t('login.enterOTP')}</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 6) {
                      setOtpCode(value);
                    }
                  }}
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('phone');
                    setOtpCode('');
                  }}
                  className="flex-1"
                >
                  {t('common.back')}
                </Button>
                <Button
                  onClick={handleVerifyOTP}
                  disabled={isLoading || otpCode.length !== 6}
                  className="flex-1"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  {t('login.verify')}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Set Password */}
          {step === 'password' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{t('googleSignup.phoneVerified')}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  {t('googleSignup.setPassword')}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('googleSignup.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {t('googleSignup.passwordHint')}
                </p>
              </div>
              {password && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('googleSignup.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder={t('googleSignup.confirmPasswordPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handleSkipPassword}
                  className="flex-1"
                >
                  {t('googleSignup.skip')}
                </Button>
                {password && (
                  <Button
                    onClick={handleSetPassword}
                    disabled={isLoading || password !== confirmPassword || password.length < 6}
                    className="flex-1"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                    {t('googleSignup.setPasswordButton')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
