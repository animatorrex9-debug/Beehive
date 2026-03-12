import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import { 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, isConfigured } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { FirebaseSetupGuide } from '../../components/FirebaseSetupGuide';
import { ArrowLeft, Mail, Lock, User, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export const SignupPage = () => {
  const { user, isAdmin, loading: authLoading, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState<string | undefined>('');
  const [defaultCountry, setDefaultCountry] = useState<any>('NG'); // Default to Nigeria
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Detect country based on IP
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.country_code) {
          setDefaultCountry(data.country_code);
        }
      })
      .catch(() => {
        // Fallback to Nigeria if detection fails
        setDefaultCountry('NG');
      });
  }, []);

  useEffect(() => {
    if (!authLoading && user && user.emailVerified) {
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  }, [password]);

  const strengthColor = [
    'bg-gray-200',
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500'
  ][passwordStrength];

  const strengthLabel = [
    'Too weak',
    'Weak',
    'Fair',
    'Good',
    'Strong'
  ][passwordStrength];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!phone) {
      setError('Phone number is required');
      return;
    }
    if (!acceptTerms) {
      setError('You must accept the terms and conditions');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Send verification email
      await sendEmailVerification(user);

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        fullName,
        email,
        phone,
        role: 'user',
        kycStatus: 'unverified',
        walletBalance: 0,
        createdAt: new Date().toISOString(),
        emailVerified: false,
      });

      // Sign out user immediately after signup so they can't login without verification
      // await signOut(auth); // Keep them signed in for the verify page to allow resend

      navigate('/auth/verify-email');
      
      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setPhone(undefined);
      setAcceptTerms(false);

    } catch (err: any) {
      console.error('Signup error:', err);
      let msg = 'Failed to sign up';
      const errCode = err.code || '';
      const errMsg = err.message || '';
      
      if (errCode === 'auth/email-already-in-use' || errMsg.includes('email-already-in-use')) msg = 'An account already exists with this email.';
      else if (errCode === 'auth/weak-password' || errMsg.includes('weak-password')) msg = 'Password is too weak.';
      else if (errCode === 'auth/invalid-email' || errMsg.includes('invalid-email')) msg = 'Invalid email address.';
      else if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain')) msg = 'This domain is not authorized in Firebase. Please add it to Authorized Domains in Firebase Console.';
      else if (errCode === 'auth/network-request-failed' || errMsg.includes('network-request-failed')) msg = 'Network error. This is often caused by ad-blockers, VPNs, or incorrect Firebase settings. Please try disabling extensions or use Incognito mode.';
      else msg = errMsg || msg;
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // For Google signup, we might not have NIN or Phone initially
        // We can redirect them to a profile completion page later, 
        // but for now let's create the doc with what we have.
        await setDoc(doc(db, 'users', user.uid), {
          fullName: user.displayName || '',
          email: user.email || '',
          phone: user.phoneNumber || '',
          role: 'user',
          kycStatus: 'unverified',
          walletBalance: 0,
          createdAt: new Date().toISOString(),
          emailVerified: user.emailVerified,
        });
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured) return <FirebaseSetupGuide />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-primary py-12">
      <div className="absolute top-6 left-6 flex items-center gap-4">
        <Link to="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
          <ArrowLeft className="w-6 h-6 dark:text-white" />
        </Link>
        <Logo className="h-6" />
      </div>
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <h1 className="text-4xl font-black tracking-tighter mb-2 dark:text-white">CREATE ACCOUNT</h1>
        <p className="text-gray-500 mb-8">Join thousands of users managing their finances better.</p>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-100 text-green-600 p-4 rounded-xl flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              {success}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold dark:text-white">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                required
                className="input-field pl-12" 
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold dark:text-white">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="email" 
                  required
                  className="input-field pl-12" 
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold dark:text-white">Phone Number</label>
              <PhoneInput
                international
                defaultCountry={defaultCountry}
                value={phone}
                onChange={setPhone}
                className="PhoneInput"
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold dark:text-white">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="password" 
                  required
                  className="input-field pl-12" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Strength: {strengthLabel}</span>
                  </div>
                  <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div 
                        key={i}
                        className={`h-full flex-1 transition-colors ${i <= passwordStrength ? strengthColor : 'bg-gray-200'}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold dark:text-white">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="password" 
                  required
                  className="input-field pl-12" 
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 py-2">
            <input 
              type="checkbox" 
              id="terms"
              required
              className="mt-1 w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <label htmlFor="terms" className="text-sm text-gray-500 leading-tight">
              I agree to the <Link to="/terms" className="text-accent hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full text-lg py-4 mt-4"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-primary px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 dark:border-zinc-800 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors dark:text-white font-bold"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google
          </button>
        </form>

        <p className="text-center mt-8 text-gray-500">
          Already have an account? <Link to="/auth/login" className="text-accent font-bold hover:underline">Log In</Link>
        </p>
      </motion.div>
    </div>
  );
};
