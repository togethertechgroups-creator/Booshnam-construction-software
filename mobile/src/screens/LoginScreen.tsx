import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { COLORS, SHADOWS } from '../theme';
import { User } from '../types';
import { UserService } from '../services/userService';

const booshnamLogo = require('../assets/booshnam_logo.png');

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

type AuthMode = 'phone' | 'otp' | 'credentials';

const { width } = Dimensions.get('window');

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('phone');

  // Phone auth states
  const [phoneNumber, setPhoneNumber] = useState('9047549682');

  // OTP states
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const otpInputRefs = [
    useRef<any>(null),
    useRef<any>(null),
    useRef<any>(null),
    useRef<any>(null),
  ];

  // Staff Credentials state
  const [username, setUsername] = useState('murugan.site');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // OTP Countdown Timer
  useEffect(() => {
    let interval: any;
    if (authMode === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [authMode, resendTimer]);

  // Phone Submit -> Go to OTP
  const handlePhoneSubmit = () => {
    setErrorMsg(null);
    const cleanNum = phoneNumber.trim().replace(/\D/g, '');
    if (!cleanNum || cleanNum.length < 7) {
      setErrorMsg('Please enter a valid mobile number.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setAuthMode('otp');
      setResendTimer(30);
      setOtpDigits(['', '', '', '']);
      setTimeout(() => {
        otpInputRefs[0]?.current?.focus();
      }, 150);
    }, 300);
  };

  // OTP Change
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 3) {
      otpInputRefs[index + 1]?.current?.focus();
    }
  };

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountFilterDept, setAccountFilterDept] = useState('ALL');
  const allAccounts = UserService.getAllUsers();

  // OTP Verify -> Complete Login
  const handleVerifyOtp = () => {
    setErrorMsg(null);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const res = UserService.authenticateByPhone(phoneNumber);
      if (!res.success || !res.user) {
        setErrorMsg(res.error || 'Failed to authenticate phone number.');
        return;
      }
      onLogin(res.user);
    }, 300);
  };

  // Credentials Submit -> Complete Login
  const handleCredentialsLogin = () => {
    setErrorMsg(null);
    if (!username.trim()) {
      setErrorMsg('Please enter username, email or mobile number.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const res = UserService.authenticate(username, password);
      if (!res.success || !res.user) {
        setErrorMsg(res.error || 'Invalid credentials or inactive account.');
        return;
      }
      onLogin(res.user);
    }, 300);
  };

  // Direct login from account selector
  const handleSelectAccount = (user: User) => {
    if (user.status === 'INACTIVE') {
      Alert.alert(
        'Account Inactive',
        `The account for "${user.name}" (@${user.username}) has been deactivated by Admin. Please contact administrator to restore access.`
      );
      return;
    }
    setShowAccountModal(false);
    onLogin(user);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Top Header: Pure White with Booshnam Logo matching Web ── */}
          <View style={styles.headerWhiteContainer}>
            <View style={styles.logoWrapper}>
              <Image
                source={booshnamLogo}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headerBottomCurve}>
              <View style={styles.headerCurveAccent} />
            </View>
          </View>

          {/* ── Main Content Area on Booshnam Red Background ── */}
          <View style={styles.redAreaContent}>
            {/* Centered Form Wrapper: Keeps form nicely grouped and centered */}
            <View style={styles.centeredFormWrapper}>
              {/* Error Banner */}
              {errorMsg && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              {/* ══════════════════════════════════════════════════════
                  VIEW 1: Phone Authentication
                 ══════════════════════════════════════════════════════ */}
              {authMode === 'phone' && (
                <View style={styles.formContainer}>
                  {/* Title & Subtitle */}
                  <View style={styles.titleBlock}>
                    <Text style={styles.formTitle}>Login & Sign Up</Text>
                    <Text style={styles.formSubtitle}>
                      Enter your country code and mobile number
                    </Text>
                  </View>

                  {/* Phone Auth Illustration Graphic */}
                  <View style={styles.illustrationWrapper}>
                    <View style={styles.illustrationCircle}>
                      <View style={styles.illustrationPhone}>
                        <View style={styles.phoneScreen}>
                          <View style={styles.phoneNotch} />
                          <View style={styles.phoneBubble}>
                            <Text style={styles.phoneBubbleText}>908.....</Text>
                          </View>
                          <View style={styles.phoneUserHand} />
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Mobile Input Group (Card) */}
                  <View style={styles.phoneInputRow}>
                    {/* Flag + Country Code */}
                    <View style={styles.countryCodeBadge}>
                      <Text style={styles.flagEmoji}>🇮🇳</Text>
                      <Text style={styles.dialCodeText}>+91</Text>
                    </View>

                    {/* Phone Input */}
                    <TextInput
                      style={styles.phoneTextInput}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder="9047549682"
                      placeholderTextColor="#94a3b8"
                      keyboardType="phone-pad"
                      maxLength={14}
                    />
                  </View>

                  {/* Purple CTA Button: Next Card */}
                  <TouchableOpacity
                    style={[styles.purpleButton, SHADOWS.md]}
                    activeOpacity={0.88}
                    onPress={handlePhoneSubmit}
                    disabled={isLoading}
                  >
                    <Text style={styles.purpleButtonText}>
                      {isLoading ? 'Sending Code...' : 'Next  ➔'}
                    </Text>
                  </TouchableOpacity>

                  {/* Switch to Staff Credentials */}
                  <TouchableOpacity
                    style={styles.switchAuthLink}
                    activeOpacity={0.7}
                    onPress={() => {
                      setErrorMsg(null);
                      setAuthMode('credentials');
                    }}
                  >
                    <Text style={styles.switchAuthLinkText}>
                      Sign in with Staff Username & Password
                    </Text>
                  </TouchableOpacity>

                  {/* All Accounts Selector */}
                  <TouchableOpacity
                    style={styles.quickAccountBtn}
                    activeOpacity={0.8}
                    onPress={() => setShowAccountModal(true)}
                  >
                    <Text style={styles.quickAccountBtnText}>
                      ⚡ All Login Accounts ({allAccounts.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ══════════════════════════════════════════════════════
                  VIEW 2: OTP Verification Screen
                 ══════════════════════════════════════════════════════ */}
              {authMode === 'otp' && (
                <View style={styles.formContainer}>
                  {/* Header Row: Back button + SMS OTP badge */}
                  <View style={styles.otpHeaderRow}>
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => {
                        setErrorMsg(null);
                        setAuthMode('phone');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.backButtonText}>← Change Number</Text>
                    </TouchableOpacity>

                    <View style={styles.smsOtpBadge}>
                      <Text style={styles.smsOtpBadgeText}>SMS OTP</Text>
                    </View>
                  </View>

                  {/* Title & Subtitle */}
                  <View style={styles.titleBlock}>
                    <Text style={styles.formTitle}>Verify Mobile Number</Text>
                    <Text style={styles.formSubtitle}>
                      Enter the 4-digit code sent to{'\n'}
                      <Text style={styles.highlightText}>+91 {phoneNumber}</Text>
                    </Text>
                  </View>

                  {/* 4 Digit Boxes */}
                  <View style={styles.otpDigitsRow}>
                    {otpDigits.map((digit, idx) => (
                      <TextInput
                        key={idx}
                        ref={otpInputRefs[idx]}
                        style={styles.otpBox}
                        value={digit}
                        onChangeText={(val) => handleOtpChange(idx, val)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        placeholder="•"
                        placeholderTextColor="#cbd5e1"
                      />
                    ))}
                  </View>

                  {/* Verify Button */}
                  <TouchableOpacity
                    style={[styles.purpleButton, SHADOWS.md]}
                    activeOpacity={0.88}
                    onPress={handleVerifyOtp}
                    disabled={isLoading}
                  >
                    <Text style={styles.purpleButtonText}>
                      {isLoading ? 'Verifying Code...' : 'Verify & Continue  ➔'}
                    </Text>
                  </TouchableOpacity>

                  {/* Resend Timer */}
                  <View style={styles.resendContainer}>
                    {resendTimer > 0 ? (
                      <Text style={styles.resendTimerText}>
                        Resend code in <Text style={styles.resendBold}>{resendTimer}s</Text>
                      </Text>
                    ) : (
                      <TouchableOpacity
                        onPress={() => setResendTimer(30)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.resendActionText}>🔄 Resend OTP SMS</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* ══════════════════════════════════════════════════════
                  VIEW 3: Staff Account Login
                 ══════════════════════════════════════════════════════ */}
              {authMode === 'credentials' && (
                <View style={styles.formContainer}>
                  {/* Badge & Title */}
                  <View style={styles.credentialsBadgeRow}>
                    <View style={styles.authorizedBadge}>
                      <Text style={styles.authorizedBadgeText}>🛡️ AUTHORIZED STAFF</Text>
                    </View>
                  </View>

                  <View style={styles.titleBlock}>
                    <Text style={styles.formTitle}>Staff Account Login</Text>
                    <Text style={styles.formSubtitle}>Enter your workplace credentials</Text>
                  </View>

                  {/* Username Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Username</Text>
                    <TextInput
                      style={styles.whiteInput}
                      value={username}
                      onChangeText={setUsername}
                      placeholder="e.g. murugan.site or admin"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <View style={styles.passwordInputWrapper}>
                      <TextInput
                        style={styles.passwordInput}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        placeholderTextColor="#94a3b8"
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '🔒'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* White Button with Red Text */}
                  <TouchableOpacity
                    style={[styles.whitePrimaryButton, SHADOWS.md]}
                    activeOpacity={0.88}
                    onPress={handleCredentialsLogin}
                    disabled={isLoading}
                  >
                    <Text style={styles.whitePrimaryButtonText}>
                      {isLoading ? 'Authenticating...' : 'Sign In to Workspace  ➔'}
                    </Text>
                  </TouchableOpacity>

                  {/* Back to Mobile Login Link */}
                  <TouchableOpacity
                    style={styles.switchAuthLink}
                    activeOpacity={0.7}
                    onPress={() => {
                      setErrorMsg(null);
                      setAuthMode('phone');
                    }}
                  >
                    <Text style={styles.switchAuthLinkText}>
                      📱 Back to Mobile Login & Sign Up
                    </Text>
                  </TouchableOpacity>

                  {/* All Accounts Selector */}
                  <TouchableOpacity
                    style={styles.quickAccountBtn}
                    activeOpacity={0.8}
                    onPress={() => setShowAccountModal(true)}
                  >
                    <Text style={styles.quickAccountBtnText}>
                      ⚡ All Login Accounts ({allAccounts.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ── Footer: Anchored to the very bottom ── */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Powered by Together Tech</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ══════════════════════════════════════════════════════
          MODAL: All Existing Login Accounts Picker
         ══════════════════════════════════════════════════════ */}
      <Modal
        visible={showAccountModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={styles.accountModalOverlay}>
          <View style={styles.accountModalContent}>
            <View style={styles.accountModalHeader}>
              <View>
                <Text style={styles.accountModalTitle}>Select Existing Account</Text>
                <Text style={styles.accountModalSubtitle}>
                  Choose any role & department to log in instantly
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAccountModal(false)}
                style={styles.accountModalCloseBtn}
              >
                <Text style={styles.accountModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Department Filter Chips */}
            <View style={styles.accountFilterWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.accountFilterChip,
                    accountFilterDept === 'ALL' && styles.accountFilterChipActive,
                  ]}
                  onPress={() => setAccountFilterDept('ALL')}
                >
                  <Text
                    style={[
                      styles.accountFilterChipText,
                      accountFilterDept === 'ALL' && styles.accountFilterChipTextActive,
                    ]}
                  >
                    All ({allAccounts.length})
                  </Text>
                </TouchableOpacity>
                {['Civil Engineering', 'Site Operations', 'Finance & Accounts', 'Project Management', 'Executive Management', 'Procurement & Materials'].map(
                  (d) => {
                    const active = accountFilterDept === d;
                    const count = allAccounts.filter((a) => a.department === d).length;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.accountFilterChip, active && styles.accountFilterChipActive]}
                        onPress={() => setAccountFilterDept(d)}
                      >
                        <Text
                          style={[
                            styles.accountFilterChipText,
                            active && styles.accountFilterChipTextActive,
                          ]}
                        >
                          {d} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </ScrollView>
            </View>

            {/* Accounts List */}
            <ScrollView style={styles.accountModalList} showsVerticalScrollIndicator={false}>
              {allAccounts
                .filter(
                  (a) =>
                    accountFilterDept === 'ALL' ||
                    a.department.toLowerCase() === accountFilterDept.toLowerCase()
                )
                .map((acc) => {
                  const isActive = acc.status === 'ACTIVE';
                  const initials = acc.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.accountCard,
                        !isActive && styles.accountCardInactive,
                      ]}
                      activeOpacity={0.75}
                      onPress={() => handleSelectAccount(acc)}
                    >
                      <View
                        style={[
                          styles.accountAvatar,
                          {
                            backgroundColor: acc.role_code.includes('ADMIN')
                              ? '#fee2e2'
                              : acc.role_code.includes('SITE')
                              ? '#e0f2fe'
                              : acc.role_code.includes('FINANCE')
                              ? '#fef3c7'
                              : '#f1f5f9',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.accountAvatarText,
                            {
                              color: acc.role_code.includes('ADMIN')
                                ? '#b91c1c'
                                : acc.role_code.includes('SITE')
                                ? '#0369a1'
                                : acc.role_code.includes('FINANCE')
                                ? '#b45309'
                                : '#334155',
                            },
                          ]}
                        >
                          {initials}
                        </Text>
                      </View>

                      <View style={styles.accountInfoCol}>
                        <View style={styles.accountNameRow}>
                          <Text style={styles.accountNameText}>{acc.name}</Text>
                          <View
                            style={[
                              styles.accountStatusBadge,
                              {
                                backgroundColor: isActive ? '#f0fdf4' : '#fef2f2',
                                borderColor: isActive ? '#bbf7d0' : '#fecaca',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.accountStatusText,
                                { color: isActive ? '#16a34a' : '#dc2626' },
                              ]}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.accountUserMeta}>
                          @{acc.username} • 📱 {acc.phone}
                        </Text>

                        <View style={styles.accountBadgesRow}>
                          <View style={styles.accountRoleBadge}>
                            <Text style={styles.accountRoleText}>{acc.role}</Text>
                          </View>
                          <View style={styles.accountDeptBadge}>
                            <Text style={styles.accountDeptText}>{acc.department}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.accountArrowCol}>
                        <Text style={styles.accountArrowText}>➔</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: COLORS.primary, // #ED1C24
  },

  // ── Header White Container ──
  headerWhiteContainer: {
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 14 : 36) : 20,
    paddingBottom: 20,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 10,
  },
  logoWrapper: {
    width: width * 0.74,
    maxWidth: 280,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  headerBottomCurve: {
    position: 'absolute',
    bottom: -6,
    width: 60,
    height: 6,
    alignItems: 'center',
  },
  headerCurveAccent: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ED1C24',
    opacity: 0.45,
  },

  // ── Red Area Content: flex: 1 with space-between pushes footer to bottom ──
  redAreaContent: {
    flex: 1,
    backgroundColor: COLORS.primary, // #ED1C24
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 18 : 26,
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // ── Centered Form Wrapper: Keeps form in the vertical center of the red space ──
  centeredFormWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 380,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },

  // ── Form Container ──
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },

  titleBlock: {
    alignItems: 'center',
    marginBottom: 10,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  highlightText: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // ── Phone Illustration Graphic ──
  illustrationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  illustrationCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EAF3FD',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  illustrationPhone: {
    width: 50,
    height: 82,
    borderRadius: 9,
    borderWidth: 2.5,
    borderColor: '#3B82F6',
    backgroundColor: '#ffffff',
    padding: 3,
    position: 'relative',
    alignItems: 'center',
  },
  phoneScreen: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  phoneNotch: {
    width: 16,
    height: 2.5,
    backgroundColor: '#3B82F6',
    borderRadius: 1.5,
    marginBottom: 8,
  },
  phoneBubble: {
    backgroundColor: '#3B66F5',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginTop: 6,
  },
  phoneBubbleText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  phoneUserHand: {
    position: 'absolute',
    bottom: -6,
    right: -8,
    width: 18,
    height: 22,
    backgroundColor: '#FFAF74',
    borderTopLeftRadius: 9,
    borderBottomLeftRadius: 9,
    opacity: 0.95,
  },

  // ── Inputs Row ──
  phoneInputRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 12,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  flagEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  dialCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  phoneTextInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // ── Purple Action Button ──
  purpleButton: {
    width: '100%',
    backgroundColor: '#5B3CE6', // Web Purple CTA
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  purpleButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Switch Auth Link ──
  switchAuthLink: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  switchAuthLinkText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // ── OTP Specifics ──
  otpHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    paddingBottom: 10,
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  smsOtpBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  smsOtpBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  otpDigitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginVertical: 16,
  },
  otpBox: {
    width: 54,
    height: 58,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    color: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  resendTimerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  resendBold: {
    color: '#ffffff',
    fontWeight: '700',
  },
  resendActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // ── Credentials Specifics ──
  credentialsBadgeRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  authorizedBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  authorizedBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 5,
  },
  whiteInput: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  passwordInputWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  eyeIconText: {
    fontSize: 16,
  },
  whitePrimaryButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  whitePrimaryButtonText: {
    color: '#ED1C24', // Booshnam Red
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // ── Error Banner ──
  errorBanner: {
    width: '100%',
    maxWidth: 380,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  errorIcon: {
    marginRight: 6,
    fontSize: 12,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  // ── Footer: Anchored to the very bottom ──
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'android' ? 16 : 10,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Quick Account Button ──
  quickAccountBtn: {
    marginTop: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    alignSelf: 'center',
  },
  quickAccountBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Account Picker Modal Styles ──
  accountModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  accountModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
  },
  accountModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  accountModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  accountModalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  accountModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountModalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  accountFilterWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  accountFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  accountFilterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  accountFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  accountFilterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  accountModalList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  accountCardInactive: {
    backgroundColor: '#f8fafc',
    opacity: 0.65,
    borderColor: '#fecaca',
  },
  accountAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountAvatarText: {
    fontSize: 15,
    fontWeight: '900',
  },
  accountInfoCol: {
    flex: 1,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 6,
  },
  accountNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  accountStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  accountStatusText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  accountUserMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 6,
  },
  accountBadgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  accountRoleBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  accountRoleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  accountDeptBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  accountDeptText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  accountArrowCol: {
    paddingLeft: 8,
  },
  accountArrowText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
