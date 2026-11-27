import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from '../lib/icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { loginWithEmail, signUpWithEmailPassword, resetPassword, loginWithGoogle } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialMode: 'signin' | 'signup' | undefined = route?.params?.initialMode;

  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialMode === 'signup') {
      setIsSignUp(true);
      setErrorMessage(null);
    } else if (initialMode === 'signin') {
      setIsSignUp(false);
      setErrorMessage(null);
    }
  }, [initialMode]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter your email and password.');
      return;
    }
    if (isSignUp && !acceptTerms) {
      setErrorMessage('You must accept the Terms of Service and Privacy Policy.');
      return;
    }
    if (isSignUp && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setErrorMessage(null);
    setIsWorking(true);
    try {
      if (isSignUp) await signUpWithEmailPassword(email.trim(), password);
      else await loginWithEmail(email.trim(), password);
    } catch (error: any) {
      setErrorMessage(friendlyAuthError(error?.code));
    } finally {
      setIsWorking(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Enter your email above first, then tap "Forgot password?" again.');
      return;
    }
    try {
      await resetPassword(email.trim());
      Alert.alert('Check your email', 'A password reset link has been sent.');
    } catch (error: any) {
      setErrorMessage(friendlyAuthError(error?.code));
    }
  };

  const handleGoogle = async () => {
    setErrorMessage(null);
    setIsWorking(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      if (error?.code === 'auth/unauthorized-domain') {
        console.warn('Google sign-in domain not authorized:', error);
        setErrorMessage('Domain not authorized in Firebase Console. Please add it to Authorized Domains in Firebase Authentication settings.');
      } else {
        console.error('Google sign-in error:', error);
        setErrorMessage('Google sign-in failed. Please try again.');
      }
    } finally {
      setIsWorking(false);
    }
  };

  const iconColor = colors.mutedForeground;
  const iconSize = 18;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {navigation.canGoBack() ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={s.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Back to onboarding"
            >
              <ArrowLeft size={22} color={colors.foreground} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}

          <View style={s.header}>
            <Image source={require('../../assets/citivas-logo.png')} style={s.logo} resizeMode="contain" />
            <Text style={[s.brand, { color: colors.foreground }]}>Citivas</Text>
            <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
              {isSignUp ? 'Create your account to explore Nigeria' : 'Welcome back — discover your city'}
            </Text>
          </View>

          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.tabs, { backgroundColor: colors.muted }]}>
              <TouchableOpacity
                style={[s.tab, !isSignUp && { backgroundColor: colors.card }]}
                onPress={() => { setIsSignUp(false); setErrorMessage(null); }}
              >
                <Text style={[s.tabText, !isSignUp && { color: colors.primary }]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, isSignUp && { backgroundColor: colors.card }]}
                onPress={() => { setIsSignUp(true); setErrorMessage(null); }}
              >
                <Text style={[s.tabText, isSignUp && { color: colors.primary }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <View style={s.field}>
              <Text style={[s.label, { color: colors.foreground }]}>Email</Text>
              <View style={[s.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Mail size={iconSize} color={iconColor} strokeWidth={1.75} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[s.input, { color: colors.foreground }]}
                />
              </View>
            </View>

            <View style={s.field}>
              <Text style={[s.label, { color: colors.foreground }]}>Password</Text>
              <View style={[s.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Lock size={iconSize} color={iconColor} strokeWidth={1.75} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPassword}
                  style={[s.input, { color: colors.foreground }]}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  {showPassword ? <EyeOff size={iconSize} color={iconColor} /> : <Eye size={iconSize} color={iconColor} />}
                </TouchableOpacity>
              </View>
            </View>

            {isSignUp && (
              <View style={s.field}>
                <Text style={[s.label, { color: colors.foreground }]}>Confirm Password</Text>
                <View style={[s.inputRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Lock size={iconSize} color={iconColor} strokeWidth={1.75} />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter password"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showConfirmPassword}
                    style={[s.input, { color: colors.foreground }]}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    {showConfirmPassword ? <EyeOff size={iconSize} color={iconColor} /> : <Eye size={iconSize} color={iconColor} />}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {isSignUp && (
              <TouchableOpacity style={s.termsRow} onPress={() => setAcceptTerms(!acceptTerms)} activeOpacity={0.7}>
                <View style={[s.checkbox, acceptTerms && { backgroundColor: colors.primary, borderColor: colors.primary }, { borderColor: colors.border }]}>
                  {acceptTerms && <Text style={s.checkMark}>✓</Text>}
                </View>
                <Text style={[s.termsText, { color: colors.mutedForeground }]}>
                  I agree to the <Text style={[s.termsLink, { color: colors.primary }]}>Terms of Service</Text> and{' '}
                  <Text style={[s.termsLink, { color: colors.primary }]}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
            )}

            {errorMessage ? <Text style={[s.error, { color: colors.destructive }]}>{errorMessage}</Text> : null}

            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: colors.primary }, isWorking && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isWorking}
              activeOpacity={0.8}
            >
              {isWorking ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.submitText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
              )}
            </TouchableOpacity>

            {!isSignUp && (
              <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'center', marginTop: 12 }}>
                <Text style={[s.forgotText, { color: colors.primary }]}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <View style={[s.dividerRow, { borderColor: colors.border }]}>
              <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[s.dividerText, { color: colors.mutedForeground }]}>or</Text>
              <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              style={[s.googleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={handleGoogle}
              disabled={isWorking}
              activeOpacity={0.8}
            >
              <GoogleIcon />
              <Text style={[s.googleText, { color: colors.foreground }]}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          <View style={s.toggleRow}>
            <Text style={[s.toggleLabel, { color: colors.mutedForeground }]}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setErrorMessage(null); }}>
              <Text style={[s.toggleLink, { color: colors.primary }]}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
            </TouchableOpacity>
          </View>

          {!navigation.canGoBack() ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('Onboarding')}
              style={{ alignSelf: 'center', marginTop: 14, minHeight: 40, justifyContent: 'center' }}
              activeOpacity={0.7}
            >
              <Text style={[s.toggleLink, { color: colors.mutedForeground, fontSize: 13 }]}>
                View welcome tour
              </Text>
            </TouchableOpacity>
          ) : null}

          <Text style={[s.footer, { color: colors.mutedForeground }]}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function GoogleIcon() {
  return (
    <View style={s.googleIcon}>
      <Text style={s.googleG}>G</Text>
    </View>
  );
}

function friendlyAuthError(code?: string): string {
  switch (code) {
    case 'auth/invalid-email': return 'That email address looks invalid.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    case 'auth/email-already-in-use': return 'An account with this email already exists — try signing in.';
    case 'auth/weak-password': return 'Password should be at least 6 characters.';
    default: return 'Something went wrong. Please try again.';
  }
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: 6,
  },

  header: { paddingTop: 16, paddingBottom: 28, alignItems: 'center' },
  logo: { width: 80, height: 80, marginBottom: 12, borderRadius: 16 },
  brand: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },

  card: {
    borderRadius: 20,
    marginTop: 4,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderWidth: 1,
  },

  tabs: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabText: { fontSize: 14, fontWeight: '600' },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, height: 48, gap: 10,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 10 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  termsText: { flex: 1, fontSize: 13, lineHeight: 18 },
  termsLink: { fontWeight: '600' },

  error: { fontSize: 13, textAlign: 'center', marginBottom: 12 },

  submitBtn: { borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  forgotText: { fontSize: 13, fontWeight: '600' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, height: 50,
  },
  googleIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  googleG: { fontSize: 14, fontWeight: '800', color: '#4285F4', fontFamily: 'System' },
  googleText: { fontSize: 15, fontWeight: '600' },

  toggleRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, gap: 6 },
  toggleLabel: { fontSize: 14 },
  toggleLink: { fontSize: 14, fontWeight: '700' },

  footer: { fontSize: 11, textAlign: 'center', marginTop: 20, lineHeight: 16 },
});
