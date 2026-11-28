import React, { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ApiError } from '../services/backend';
import { CustomerProfile, customerAuthService } from '../services/customerAuthService';
import { DeliveryArea, Order } from '../types';
import { formatCurrency } from '../utilities/currency';
import { Icons } from '../utilities/icons';
import { useLanguage } from '../context/LanguageContext';
import { isValidAddress, isValidBangladeshPhone, isValidEmail, isValidName } from '../utilities/validation';

type AccountMode = 'login' | 'register' | 'forgot' | 'verifyOtp' | 'resetPassword';

function customerErrorMessage(error: unknown, isBangla: boolean, mode: AccountMode): string {
  if (error instanceof ApiError) {
    if (error.fieldErrors) {
      const fields = Object.keys(error.fieldErrors);
      if (fields.includes('name')) {
        return isBangla ? 'কমপক্ষে ২ অক্ষরের সঠিক নাম লিখুন।' : 'Enter a name with at least 2 characters.';
      }
      if (fields.includes('email')) {
        return isBangla ? 'সঠিক ইমেইল ঠিকানা লিখুন।' : 'Enter a valid email address.';
      }
      if (fields.includes('phone')) {
        return isBangla
          ? 'সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর লিখুন (যেমন: 017XXXXXXXX)।'
          : 'Enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).';
      }
      if (fields.includes('deliveryArea')) {
        return isBangla ? 'ঢাকার ভিতরে বা ঢাকার বাইরে নির্বাচন করুন।' : 'Select Inside Dhaka or Outside Dhaka.';
      }
      if (fields.includes('address')) {
        return isBangla
          ? 'বাড়ি, রোড, এলাকা ও জেলার বিস্তারিত ঠিকানা লিখুন।'
          : 'Enter a complete address with house, road, area and district.';
      }
      if (fields.includes('password')) {
        return isBangla
          ? 'পাসওয়ার্ড ৮ থেকে ৭২ অক্ষরের মধ্যে হতে হবে।'
          : 'Password must be between 8 and 72 characters.';
      }
      if (fields.includes('otp')) {
        return isBangla ? '৪ সংখ্যার OTP লিখুন।' : 'Enter the 4-digit code.';
      }
      if (fields.includes('newPassword')) {
        return isBangla
          ? 'পাসওয়ার্ড ৮ থেকে ৭২ বাইটের মধ্যে হতে হবে।'
          : 'Password must be between 8 and 72 bytes.';
      }
    }
    if (error.status === 400 && mode === 'verifyOtp') {
      return isBangla
        ? 'OTP ভুল বা মেয়াদ শেষ। নতুন কোড নিয়ে আবার চেষ্টা করুন।'
        : 'The code is incorrect or expired. Request a new code and try again.';
    }
    if (error.status === 400 && mode === 'resetPassword') {
      return isBangla
        ? 'যাচাইকরণ সেশনের মেয়াদ শেষ। নতুন OTP দিয়ে আবার শুরু করুন।'
        : 'Your verification session expired. Start again with a new code.';
    }
    if (error.status === 401 && mode === 'login') {
      return isBangla ? 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' : 'The email or password is incorrect.';
    }
    if (error.status === 401 && mode === 'forgot') {
      return isBangla
        ? 'রিসেট কোডের অনুরোধটি গ্রহণ করা যায়নি। আবার চেষ্টা করুন।'
        : 'The reset-code request was rejected. Please try again shortly.';
    }
    if (error.status === 409 && mode === 'register') {
      return isBangla
        ? 'এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট আছে। লগইন করুন।'
        : 'An account with this email already exists. Sign in instead.';
    }
    if (error.status === 423) {
      return isBangla
        ? 'অনেকবার ভুল চেষ্টা হয়েছে। ১৫ মিনিট পর আবার চেষ্টা করুন।'
        : 'Too many failed attempts. Please try again in 15 minutes.';
    }
    if (error.status >= 500) {
      return isBangla
        ? 'সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
        : 'A server error occurred. Please try again shortly.';
    }
    return error.message;
  }

  if (error instanceof TypeError) {
    return isBangla
      ? 'সার্ভারের সাথে সংযোগ করা যাচ্ছে না। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।'
      : 'Could not connect to the server. Check your connection and try again.';
  }
  return isBangla ? 'অনুরোধটি সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।' : 'Unable to complete the request. Please try again.';
}

export const CustomerAccountPage: React.FC = () => {
  const { language } = useLanguage();
  const isBangla = language === 'bn';
  const [mode, setMode] = useState<AccountMode>('login');
  const [session, setSession] = useState(() => customerAuthService.getSession());
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [editingPersonalDetails, setEditingPersonalDetails] = useState(false);
  const [savingPersonalDetails, setSavingPersonalDetails] = useState(false);
  const [personalDetailsError, setPersonalDetailsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<DeliveryArea>(
    () => session?.deliveryArea || 'Inside Dhaka'
  );
  const [address, setAddress] = useState(() => session?.address || '');
  const [editingAddress, setEditingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const loadAccount = async () => {
    setLoadingAccount(true);
    setError('');
    try {
      const [nextProfile, nextOrders] = await Promise.all([
        customerAuthService.getProfile(),
        customerAuthService.getOrders(),
      ]);
      setProfile(nextProfile);
      setOrders(nextOrders);
      setName(nextProfile.name);
      setEmail(nextProfile.email);
      setPhone(nextProfile.phone);
      setDeliveryArea(nextProfile.deliveryArea || 'Inside Dhaka');
      setAddress(nextProfile.address || '');
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        customerAuthService.logout();
        setError(isBangla
          ? 'আপনার সেশন শেষ হয়েছে। আবার লগইন করুন।'
          : 'Your session expired. Please sign in again.');
      } else {
        setError(customerErrorMessage(loadError, isBangla, 'login'));
      }
    } finally {
      setLoadingAccount(false);
    }
  };

  useEffect(() => {
    if (session) void loadAccount();
    const handleAuthUpdate = () => {
      const nextSession = customerAuthService.getSession();
      setSession(nextSession);
      setProfile(null);
      setOrders([]);
      setDeliveryArea(nextSession?.deliveryArea || 'Inside Dhaka');
      setAddress(nextSession?.address || '');
      setEditingAddress(false);
      setAddressError('');
      setError('');
    };
    window.addEventListener('quantum_customer_auth_updated', handleAuthUpdate);
    return () => window.removeEventListener('quantum_customer_auth_updated', handleAuthUpdate);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      if (mode === 'forgot') {
        if (!isValidEmail(email)) {
          setError(isBangla ? 'সঠিক ইমেইল ঠিকানা লিখুন।' : 'Enter a valid email address.');
          return;
        }
        await customerAuthService.forgotPassword(email.trim());
        setOtp('');
        setMode('verifyOtp');
        setSuccess(isBangla
          ? 'অ্যাকাউন্টটি OTP পাওয়ার উপযুক্ত হলে ৪ সংখ্যার কোড ইমেইল করা হবে। কোডটি ১০ মিনিটের মধ্যে ব্যবহার করুন।'
          : 'If the account exists and is eligible, a 4-digit code will be emailed. It expires in 10 minutes.');
        return;
      }

      if (mode === 'verifyOtp') {
        if (!/^[0-9]{4}$/.test(otp)) {
          setError(isBangla ? '৪ সংখ্যার OTP লিখুন।' : 'Enter the 4-digit code.');
          return;
        }
        const verification = await customerAuthService.verifyPasswordResetOtp(email.trim(), otp);
        setResetToken(verification.resetToken);
        setMode('resetPassword');
        setSuccess(isBangla
          ? 'ইমেইল যাচাই হয়েছে। এখন নতুন পাসওয়ার্ড দিন।'
          : 'Code verified. Create your new password.');
        return;
      }

      if (mode === 'resetPassword') {
        if (!resetToken) {
          setMode('forgot');
          setError(isBangla
            ? 'যাচাইকরণ শেষ হয়েছে। নতুন OTP নিয়ে আবার চেষ্টা করুন।'
            : 'Your verification expired. Request a new code and try again.');
          return;
        }
        if (new TextEncoder().encode(newPassword).length < 8
            || new TextEncoder().encode(newPassword).length > 72) {
          setError(isBangla
            ? 'পাসওয়ার্ড ৮ থেকে ৭২ বাইটের মধ্যে হতে হবে।'
            : 'Password must be between 8 and 72 bytes.');
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setError(isBangla ? 'দুটি পাসওয়ার্ড মিলছে না।' : 'The passwords do not match.');
          return;
        }
        await customerAuthService.resetPassword(resetToken, newPassword);
        setResetToken('');
        setOtp('');
        setPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setMode('login');
        setSuccess(isBangla
          ? 'পাসওয়ার্ড পরিবর্তন হয়েছে। নতুন পাসওয়ার্ড দিয়ে লগইন করুন।'
          : 'Password updated. Sign in with your new password.');
        return;
      }

      if (!isValidEmail(email)) {
        setError(isBangla ? 'সঠিক ইমেইল ঠিকানা লিখুন।' : 'Enter a valid email address.');
        return;
      }
      if (!password) {
        setError(isBangla ? 'পাসওয়ার্ড লিখুন।' : 'Enter your password.');
        return;
      }
      if (mode === 'register') {
        const passwordBytes = new TextEncoder().encode(password).length;
        if (passwordBytes < 8 || passwordBytes > 72) {
          setError(isBangla
            ? 'পাসওয়ার্ড ৮ থেকে ৭২ বাইটের মধ্যে হতে হবে।'
            : 'Password must be between 8 and 72 bytes.');
          return;
        }
      }
      if (mode === 'register' && !isValidName(name)) {
        setError(isBangla ? 'কমপক্ষে ২ অক্ষরের সঠিক নাম লিখুন।' : 'Enter a name with at least 2 characters.');
        return;
      }
      if (mode === 'register' && !isValidBangladeshPhone(phone)) {
        setError(isBangla
          ? 'সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন (01[3-9]XXXXXXXX অথবা +8801[3-9]XXXXXXXX)।'
          : 'Enter a valid Bangladesh number (01[3-9]XXXXXXXX or +8801[3-9]XXXXXXXX).');
        return;
      }
      if (mode === 'register' && !isValidAddress(address)) {
        setError(isBangla
          ? 'বাড়ি, রোড, এলাকা ও জেলার বিস্তারিত ঠিকানা লিখুন।'
          : 'Enter a complete address with house, road, area and district.');
        return;
      }
      const signedIn = mode === 'register'
        ? await customerAuthService.register({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim().replace(/[\s-]/g, ''),
            password,
            deliveryArea,
            address: address.trim(),
          })
        : await customerAuthService.login(email.trim(), password);
      setSession(signedIn);
      setPassword('');
      setProfile(null);
      setOrders([]);
      await loadAccount();
    } catch (submitError) {
      setError(customerErrorMessage(submitError, isBangla, mode));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await customerAuthService.forgotPassword(email.trim());
      setSuccess(isBangla
        ? 'অ্যাকাউন্টটি নতুন কোড পাওয়ার উপযুক্ত হলে ইমেইল করা হবে। ১৫ মিনিটে সর্বোচ্চ ৩টি কোড পাঠানো যায়।'
        : 'If eligible, another code will be emailed. Up to 3 codes can be sent every 15 minutes.');
    } catch (resendError) {
      setError(customerErrorMessage(resendError, isBangla, mode));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    customerAuthService.logout();
    setSession(null);
    setProfile(null);
    setOrders([]);
    setPassword('');
  };

  const handleSaveAddress = async (event: FormEvent) => {
    event.preventDefault();
    setAddressError('');
    if (!isValidAddress(address)) {
      setAddressError(isBangla
        ? 'বাড়ি, রোড, এলাকা ও জেলার বিস্তারিত ঠিকানা লিখুন।'
        : 'Enter a complete address with house, road, area and district.');
      return;
    }

    setSavingAddress(true);
    try {
      const updatedProfile = await customerAuthService.updateProfile({
        deliveryArea,
        address: address.trim(),
      });
      setProfile(updatedProfile);
      setAddress(updatedProfile.address || '');
      setDeliveryArea(updatedProfile.deliveryArea || 'Inside Dhaka');
      setEditingAddress(false);
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.status === 401) {
        customerAuthService.logout();
        setError(isBangla
          ? 'আপনার সেশন শেষ হয়েছে। আবার লগইন করুন।'
          : 'Your session expired. Please sign in again.');
      } else {
        setAddressError(customerErrorMessage(saveError, isBangla, 'register'));
      }
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSavePersonalDetails = async (event: FormEvent) => {
    event.preventDefault();
    setPersonalDetailsError('');
    if (!isValidName(name)) {
      setPersonalDetailsError(isBangla
        ? 'কমপক্ষে ২ অক্ষরের সঠিক নাম লিখুন।'
        : 'Enter a name with at least 2 characters.');
      return;
    }
    if (!isValidEmail(email)) {
      setPersonalDetailsError(isBangla ? 'সঠিক ইমেইল ঠিকানা লিখুন।' : 'Enter a valid email address.');
      return;
    }
    if (!isValidBangladeshPhone(phone)) {
      setPersonalDetailsError(isBangla
        ? 'সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর লিখুন।'
        : 'Enter a valid 11-digit Bangladeshi mobile number.');
      return;
    }

    setSavingPersonalDetails(true);
    try {
      const updatedProfile = await customerAuthService.updatePersonalDetails({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim().replace(/[\s-]/g, ''),
      });
      setProfile(updatedProfile);
      setSession((current) => current
        ? {
            ...current,
            name: updatedProfile.name,
            email: updatedProfile.email,
            phone: updatedProfile.phone,
          }
        : current);
      setName(updatedProfile.name);
      setEmail(updatedProfile.email);
      setPhone(updatedProfile.phone);
      setEditingPersonalDetails(false);
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.status === 401) {
        customerAuthService.logout();
        setPersonalDetailsError(isBangla
          ? 'আপনার সেশন শেষ হয়েছে। আবার লগইন করুন।'
          : 'Your session expired. Please sign in again.');
      } else {
        setPersonalDetailsError(customerErrorMessage(saveError, isBangla, 'login'));
      }
    } finally {
      setSavingPersonalDetails(false);
    }
  };

  if (session) {
    return (
      <section className="min-h-[60vh] bg-surface-alt px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-float">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted">{isBangla ? 'আমার অ্যাকাউন্ট' : 'My account'}</p>
                {!editingPersonalDetails && (
                  <>
                    <h1 className="mt-1 text-2xl font-bold text-ink">
                      {profile?.name || session.name}
                    </h1>
                    <p className={`mt-1 text-sm ${isValidEmail(profile?.email || session.email) ? 'text-muted' : 'text-error'}`}>
                      {profile?.email || session.email}
                    </p>
                    {!isValidEmail(profile?.email || session.email) && (
                      <p role="alert" className="mt-1 text-xs text-error">
                        {isBangla
                          ? 'সংরক্ষিত ইমেইলটি সঠিক নয়। প্রোফাইল সম্পাদনা করে ঠিক করুন।'
                          : 'This saved email appears invalid. Edit your profile to correct it.'}
                      </p>
                    )}
                    <p className="text-sm text-muted">{profile?.phone || session.phone}</p>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {!editingPersonalDetails && (
                  <button
                    type="button"
                    onClick={() => {
                      setName(profile?.name || session.name);
                      setEmail(profile?.email || session.email);
                      setPhone(profile?.phone || session.phone);
                      setPersonalDetailsError('');
                      setEditingPersonalDetails(true);
                    }}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-quantum hover:bg-quantum-soft"
                  >
                    {isBangla ? 'প্রোফাইল সম্পাদনা' : 'Edit profile'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink hover:border-quantum/40 hover:text-quantum"
                >
                  <FontAwesomeIcon icon={Icons.user} aria-hidden="true" />
                  {isBangla ? 'লগআউট' : 'Sign out'}
                </button>
              </div>
            </div>
            {editingPersonalDetails && (
              <form
                onSubmit={(event) => void handleSavePersonalDetails(event)}
                className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2"
              >
                <label className="block text-sm font-medium text-ink">
                  {isBangla ? 'পূর্ণ নাম' : 'Full name'}
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium text-ink">
                  {isBangla ? 'ইমেইল' : 'Email'}
                  <input
                    required
                    type="email"
                    maxLength={254}
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
                  />
                  {email.trim() && !isValidEmail(email) && (
                    <span role="alert" className="mt-1 block text-xs text-error">
                      {isBangla ? 'সঠিক ইমেইল ঠিকানা লিখুন।' : 'Enter a valid email address.'}
                    </span>
                  )}
                </label>
                <label className="block text-sm font-medium text-ink sm:col-span-2">
                  {isBangla ? 'মোবাইল নম্বর' : 'Mobile number'}
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder={isBangla
                      ? 'যেমন: 017XXXXXXXX বা +88017XXXXXXXX'
                      : 'e.g. 017XXXXXXXX or +88017XXXXXXXX'}
                    className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm sm:max-w-md"
                  />
                </label>
                {personalDetailsError && (
                  <p role="alert" className="text-sm text-error sm:col-span-2">
                    {personalDetailsError}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={savingPersonalDetails}
                    className="min-h-10 rounded-xl bg-quantum px-4 py-2 text-sm font-semibold text-white hover:bg-quantum-hover disabled:opacity-60"
                  >
                    {savingPersonalDetails
                      ? (isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...')
                      : (isBangla ? 'প্রোফাইল সংরক্ষণ' : 'Save profile')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setName(profile?.name || session.name);
                      setEmail(profile?.email || session.email);
                      setPhone(profile?.phone || session.phone);
                      setPersonalDetailsError('');
                      setEditingPersonalDetails(false);
                    }}
                    className="min-h-10 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-ink">
                  {isBangla ? 'ডেলিভারির ঠিকানা' : 'Saved delivery address'}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {isBangla ? 'চেকআউটে এই ঠিকানা স্বয়ংক্রিয়ভাবে ব্যবহার হবে।' : 'This address will be prefilled at checkout.'}
                </p>
              </div>
              {!editingAddress && (
                <button
                  type="button"
                  onClick={() => {
                    setAddressError('');
                    setEditingAddress(true);
                  }}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-quantum hover:bg-quantum-soft"
                >
                  {isBangla ? 'ঠিকানা পরিবর্তন' : 'Edit address'}
                </button>
              )}
            </div>
            {editingAddress ? (
              <form onSubmit={(event) => void handleSaveAddress(event)} className="space-y-4">
                <label className="block text-sm font-medium text-ink">
                  {isBangla ? 'ডেলিভারি এলাকা' : 'Delivery area'}
                  <select
                    required
                    value={deliveryArea}
                    onChange={(event) => setDeliveryArea(event.target.value as DeliveryArea)}
                    className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
                  >
                    <option value="Inside Dhaka">{isBangla ? 'ঢাকার ভিতরে' : 'Inside Dhaka'}</option>
                    <option value="Outside Dhaka">{isBangla ? 'ঢাকার বাইরে' : 'Outside Dhaka'}</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-ink">
                  {isBangla ? 'সম্পূর্ণ ঠিকানা' : 'Full delivery address'}
                  <textarea
                    required
                    minLength={5}
                    maxLength={500}
                    autoComplete="street-address"
                    rows={3}
                    value={address}
                    onChange={(event) => {
                      setAddress(event.target.value);
                      setAddressError('');
                    }}
                    placeholder={isBangla
                      ? 'বাড়ি/ফ্ল্যাট, রোড, এলাকা, থানা ও জেলা লিখুন'
                      : 'House/flat, road, area, thana and district'}
                    className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
                  />
                </label>
                {addressError && <p role="alert" className="text-sm text-error">{addressError}</p>}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="min-h-10 rounded-xl bg-quantum px-4 py-2 text-sm font-semibold text-white hover:bg-quantum-hover disabled:opacity-60"
                  >
                    {savingAddress
                      ? (isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...')
                      : (isBangla ? 'ঠিকানা সংরক্ষণ' : 'Save address')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddress(profile?.address || '');
                      setDeliveryArea(profile?.deliveryArea || 'Inside Dhaka');
                      setAddressError('');
                      setEditingAddress(false);
                    }}
                    className="min-h-10 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-ink">
                  {isBangla
                    ? (deliveryArea === 'Inside Dhaka' ? 'ঢাকার ভিতরে' : 'ঢাকার বাইরে')
                    : deliveryArea}
                </p>
                <p className="whitespace-pre-wrap text-muted">
                  {address || (isBangla ? 'এখনও ঠিকানা সংরক্ষণ করা হয়নি।' : 'No delivery address saved yet.')}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-ink">
                {isBangla ? 'আমার অর্ডার' : 'Order history'}
              </h2>
              <Link to="/track-order" className="text-sm font-semibold text-quantum hover:underline">
                {isBangla ? 'অর্ডার ট্র্যাক করুন' : 'Track order'}
              </Link>
            </div>
            {loadingAccount ? (
              <p role="status" className="py-8 text-center text-sm text-muted">
                {isBangla ? 'অ্যাকাউন্ট লোড হচ্ছে...' : 'Loading your account...'}
              </p>
            ) : error ? (
              <p role="alert" className="py-4 text-sm text-error">{error}</p>
            ) : orders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                {isBangla
                  ? 'এখনো কোনো অর্ডার নেই। লগইন ছাড়াও checkout করে অর্ডার করা যাবে।'
                  : 'No account orders yet. You can also checkout as a guest without signing in.'}
              </p>
            ) : (
              <div className="divide-y divide-border">
                {orders.map((order) => (
                  <article key={order.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-ink">{order.orderNumber}</p>
                      <p className="mt-1 text-sm text-muted">
                        {new Date(order.createdAt).toLocaleDateString(isBangla ? 'bn-BD' : 'en-GB')}
                        {' · '}{order.items.length} {isBangla ? 'টি পণ্য' : 'items'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right">
                        <p className="font-semibold text-ink">{formatCurrency(order.total, language)}</p>
                        <p className="text-xs text-muted">{order.status}</p>
                      </div>
                      <Link
                        to={`/track-order?order=${encodeURIComponent(order.orderNumber)}`}
                        className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-quantum hover:bg-quantum-soft"
                      >
                        {isBangla ? 'ট্র্যাক' : 'Track'}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[60vh] bg-surface-alt px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-float sm:p-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-quantum-soft text-quantum shadow-sm">
          <FontAwesomeIcon
            icon={mode === 'login' || mode === 'register'
              ? Icons.user
              : mode === 'resetPassword'
                ? Icons.lock
                : Icons.email}
            className="h-5 w-5"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-center text-2xl font-bold text-ink">
          {mode === 'register'
            ? (isBangla ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create your account')
            : mode === 'forgot'
              ? (isBangla ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot your password?')
              : mode === 'verifyOtp'
                ? (isBangla ? 'ইমেইল যাচাই করুন' : 'Verify your email')
                : mode === 'resetPassword'
                  ? (isBangla ? 'নতুন পাসওয়ার্ড তৈরি করুন' : 'Create a new password')
                  : (isBangla ? 'অ্যাকাউন্টে লগইন করুন' : 'Sign in to your account')}
        </h1>
        <p className="mt-2 text-center text-sm leading-6 text-muted">
          {mode === 'forgot'
            ? (isBangla
              ? 'অ্যাকাউন্টটি কোড পাওয়ার উপযুক্ত হলে আপনার ইমেইলে ৪ সংখ্যার OTP পাঠানো হবে।'
              : 'If eligible, a 4-digit verification code will be emailed to your account address.')
            : mode === 'verifyOtp'
              ? (isBangla
                ? 'ইমেইলে পাঠানো ৪ সংখ্যার কোডটি লিখুন। কোডটি ১০ মিনিটের জন্য বৈধ।'
                : 'Enter the 4-digit code sent to your email. It is valid for 10 minutes.')
              : mode === 'resetPassword'
                ? (isBangla
                  ? 'অ্যাকাউন্ট সুরক্ষিত রাখতে একটি শক্তিশালী নতুন পাসওয়ার্ড দিন।'
                  : 'Choose a strong password to secure your account.')
                : (isBangla
              ? 'অ্যাকাউন্ট ছাড়া checkout করা যাবে। লগইন করলে আপনার অর্ডার হিস্ট্রি এখানে থাকবে।'
              : 'Checkout is available without an account. Sign in to keep your order history here.')}
        </p>

        {(mode === 'verifyOtp' || mode === 'resetPassword') && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-surface-alt p-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-quantum-soft text-quantum">
              <FontAwesomeIcon icon={Icons.email} className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="block text-xs text-muted">
                {isBangla ? 'যাচাইকরণের ইমেইল' : 'Verification email'}
              </span>
              <span className="block truncate text-sm font-semibold text-ink">{email}</span>
            </div>
          </div>
        )}

        {(mode === 'verifyOtp' || mode === 'resetPassword') && (
          <div className="mt-5 grid grid-cols-2 gap-2" aria-label="Password reset progress">
            <div className={`rounded-lg px-3 py-2 text-center text-xs font-semibold ${
              mode === 'verifyOtp' ? 'bg-quantum text-white' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {isBangla ? '১. OTP যাচাই' : '1. Verify code'}
            </div>
            <div className={`rounded-lg px-3 py-2 text-center text-xs font-semibold ${
              mode === 'resetPassword' ? 'bg-quantum text-white' : 'bg-surface-alt text-muted'
            }`}>
              {isBangla ? '২. নতুন পাসওয়ার্ড' : '2. New password'}
            </div>
          </div>
        )}

        <form noValidate className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          {mode === 'register' && (
            <>
              <label className="block text-sm font-medium text-ink">
                {isBangla ? 'নাম' : 'Full name'}
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError('');
                  }}
                  placeholder={isBangla ? 'যেমন: রহিম উদ্দিন' : 'e.g. Rahim Uddin'}
                  className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                {isBangla ? 'মোবাইল নম্বর' : 'Mobile number'}
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setError('');
                  }}
                  placeholder={isBangla
                    ? 'যেমন: 017XXXXXXXX বা +88017XXXXXXXX'
                    : 'e.g. 017XXXXXXXX or +88017XXXXXXXX'}
                  className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                {isBangla ? 'ডেলিভারি এলাকা' : 'Delivery area'}
                <select
                  required
                  value={deliveryArea}
                  onChange={(event) => {
                    setDeliveryArea(event.target.value as DeliveryArea);
                    setError('');
                  }}
                  className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
                >
                  <option value="Inside Dhaka">{isBangla ? 'ঢাকার ভিতরে' : 'Inside Dhaka'}</option>
                  <option value="Outside Dhaka">{isBangla ? 'ঢাকার বাইরে' : 'Outside Dhaka'}</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-ink">
                {isBangla ? 'সম্পূর্ণ ডেলিভারি ঠিকানা' : 'Full delivery address'}
                <textarea
                  required
                  minLength={5}
                  maxLength={500}
                  autoComplete="street-address"
                  rows={3}
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    setError('');
                  }}
                  placeholder={isBangla
                    ? 'বাড়ি/ফ্ল্যাট, রোড, এলাকা, থানা ও জেলা লিখুন'
                    : 'House/flat, road, area, thana and district'}
                  className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
                />
              </label>
            </>
          )}
          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <label className="block text-sm font-medium text-ink">
              {isBangla ? 'ইমেইল' : 'Email'}
              <input
                required
                type="email"
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError('');
                  setSuccess('');
                }}
                placeholder={isBangla ? 'আপনার ইমেইল লিখুন' : 'you@example.com'}
                className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
              />
            </label>
          )}
          {mode === 'verifyOtp' && (
            <div>
              <label htmlFor="customer-reset-otp" className="block text-sm font-medium text-ink">
                {isBangla ? '৪ সংখ্যার OTP' : '4-digit code'}
              </label>
              <input
                id="customer-reset-otp"
                required
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{4}"
                maxLength={4}
                value={otp}
                onChange={(event) => {
                  setOtp(event.target.value.replace(/\D/g, '').slice(0, 4));
                  setError('');
                }}
                placeholder="0000"
                className="mt-1 block w-full rounded-xl border border-border bg-surface px-3 py-3 text-center font-mono text-xl font-bold tracking-[0.5em] text-ink focus:border-quantum focus:outline-none focus:ring-2 focus:ring-quantum/20"
              />
              <p className="mt-2 text-xs text-muted">
                {isBangla ? 'কোডটি কারও সাথে শেয়ার করবেন না।' : 'Never share this code with anyone.'}
              </p>
            </div>
          )}
          {(mode === 'login' || mode === 'register') && (
            <div>
              <label htmlFor="customer-password" className="block text-sm font-medium text-ink">
                {isBangla ? 'পাসওয়ার্ড' : 'Password'}
              </label>
              <div className="relative mt-1">
                <input
                  id="customer-password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  minLength={8}
                  maxLength={72}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError('');
                  }}
                  placeholder={mode === 'register'
                    ? (isBangla ? 'কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড' : 'At least 8 characters')
                    : (isBangla ? 'আপনার পাসওয়ার্ড লিখুন' : 'Enter your password')}
                  className="block w-full rounded-xl border border-border bg-surface px-3 py-2.5 pr-11 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword
                    ? (isBangla ? 'পাসওয়ার্ড লুকান' : 'Hide password')
                    : (isBangla ? 'পাসওয়ার্ড দেখান' : 'Show password')}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-quantum"
                >
                  <FontAwesomeIcon icon={showPassword ? Icons.eyeSlash : Icons.eye} className="h-4 w-4" />
                </button>
              </div>
              {mode === 'register' && (
                <span className="mt-1 block text-xs text-muted">
                  {isBangla ? 'পাসওয়ার্ড ৮–৭২ অক্ষরের হতে হবে।' : 'Use a password between 8 and 72 characters.'}
                </span>
              )}
            </div>
          )}
          {mode === 'resetPassword' && (
            <>
              <div>
                <label htmlFor="customer-new-password" className="block text-sm font-medium text-ink">
                  {isBangla ? 'নতুন পাসওয়ার্ড' : 'New password'}
                </label>
                <div className="relative mt-1">
                  <input
                    id="customer-new-password"
                    required
                    type={showNewPassword ? 'text' : 'password'}
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="block w-full rounded-xl border border-border bg-surface px-3 py-2.5 pr-11 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((visible) => !visible)}
                    aria-label={showNewPassword
                      ? (isBangla ? 'পাসওয়ার্ড লুকান' : 'Hide password')
                      : (isBangla ? 'পাসওয়ার্ড দেখান' : 'Show password')}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted hover:text-ink"
                  >
                    <FontAwesomeIcon icon={showNewPassword ? Icons.eyeSlash : Icons.eye} className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="customer-confirm-new-password" className="block text-sm font-medium text-ink">
                  {isBangla ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm new password'}
                </label>
                <div className="relative mt-1">
                  <input
                    id="customer-confirm-new-password"
                    required
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    className="block w-full rounded-xl border border-border bg-surface px-3 py-2.5 pr-11 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword((visible) => !visible)}
                    aria-label={showConfirmNewPassword
                      ? (isBangla ? 'নিশ্চিতকরণ পাসওয়ার্ড লুকান' : 'Hide confirmation password')
                      : (isBangla ? 'নিশ্চিতকরণ পাসওয়ার্ড দেখান' : 'Show confirmation password')}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted hover:text-ink"
                  >
                    <FontAwesomeIcon
                      icon={showConfirmNewPassword ? Icons.eyeSlash : Icons.eye}
                      className="h-4 w-4"
                    />
                  </button>
                </div>
              </div>
            </>
          )}
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          {success && <p role="status" className="text-sm text-success">{success}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded-xl bg-quantum px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-quantum-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? (isBangla ? 'অপেক্ষা করুন...' : 'Please wait...')
              : mode === 'register'
                ? (isBangla ? 'রেজিস্টার করুন' : 'Create account')
                : mode === 'forgot'
                    ? (isBangla ? 'OTP পাঠান' : 'Send code')
                    : mode === 'verifyOtp'
                      ? (isBangla ? 'OTP যাচাই করুন' : 'Verify code')
                      : mode === 'resetPassword'
                        ? (isBangla ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Update password')
                  : (isBangla ? 'লগইন' : 'Sign in')}
          </button>
        </form>

        {mode === 'forgot' ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setMode('login');
              setError('');
              setSuccess('');
            }}
            className="mt-4 w-full text-sm font-semibold text-quantum hover:underline disabled:opacity-60"
          >
            {isBangla ? 'লগইনে ফিরে যান' : 'Back to sign in'}
          </button>
        ) : mode === 'verifyOtp' ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => void handleResendOtp()}
              disabled={submitting}
              className="font-semibold text-quantum hover:underline disabled:opacity-60"
            >
              {isBangla ? 'আবার OTP পাঠান' : 'Resend code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setOtp('');
                setError('');
                setSuccess('');
              }}
              disabled={submitting}
              className="font-semibold text-muted hover:text-ink disabled:opacity-60"
            >
              {isBangla ? 'ইমেইল পরিবর্তন' : 'Change email'}
            </button>
          </div>
        ) : mode === 'resetPassword' ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setMode('forgot');
              setResetToken('');
              setOtp('');
              setError('');
              setSuccess('');
            }}
            className="mt-4 w-full text-sm font-semibold text-quantum hover:underline disabled:opacity-60"
          >
            {isBangla ? 'নতুন OTP দিয়ে আবার শুরু করুন' : 'Start over with a new code'}
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setMode('forgot');
                setError('');
                setSuccess('');
              }}
              className="mt-4 w-full text-sm font-semibold text-quantum hover:underline disabled:opacity-60"
            >
              {isBangla ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
                setSuccess('');
              }}
              className="mt-3 w-full text-sm font-semibold text-quantum hover:underline disabled:opacity-60"
            >
              {mode === 'login'
                ? (isBangla ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create a new account')
                : (isBangla ? 'আগে থেকেই অ্যাকাউন্ট আছে? লগইন করুন' : 'Already registered? Sign in')}
            </button>
          </>
        )}

        {(mode === 'login' || mode === 'register') && (
          <div className="mt-6 border-t border-border pt-5 text-center">
            <p className="text-sm text-muted">
              {isBangla ? 'অ্যাকাউন্ট ছাড়াই অর্ডার ট্র্যাক করুন' : 'Track an order without signing in'}
            </p>
            <Link
              to="/track-order"
              className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink hover:border-quantum/40 hover:text-quantum"
            >
              <FontAwesomeIcon icon={Icons.delivery} aria-hidden="true" />
              {isBangla ? 'অর্ডার ট্র্যাক করুন' : 'Track an order'}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
