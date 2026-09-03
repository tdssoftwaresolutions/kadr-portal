import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuthStore} from '../../store/authStore';
import {Button, Input} from '../../components/common';
import {colors, typography, spacing} from '../../theme';
import {validateEmail} from '../../utils/helpers';

type Step = 'email' | 'otp' | 'newPassword';

export function ForgotPasswordScreen({navigation}: {navigation: any}) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const {resetPassword, confirmPasswordChange, isLoading} = useAuthStore();

  const handleSendOtp = async () => {
    if (!email || !validateEmail(email)) {
      setError('Please enter a valid email');
      return;
    }
    setError('');
    const result = await resetPassword(email.trim());
    if (result.success) {
      setStep('otp');
    } else {
      setError(result.message || 'Failed to send reset code');
    }
  };

  const handleVerifyAndReset = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    const result = await confirmPasswordChange(email.trim(), otp, password);
    if (result.success) {
      navigation.navigate('SignIn');
    } else {
      setError(result.message || 'Failed to reset password');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? 'Enter your email to receive a verification code'
                : 'Enter the code and set a new password'}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 'email' && (
            <View style={styles.form}>
              <Input
                label="Email Address"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Button title="Send Code" onPress={handleSendOtp} loading={isLoading} size="lg" />
            </View>
          )}

          {(step === 'otp' || step === 'newPassword') && (
            <View style={styles.form}>
              <Input
                label="Verification Code"
                placeholder="Enter 6-digit code"
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
              />
              <Input
                label="New Password"
                placeholder="Min 8 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <Input
                label="Confirm New Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              <Button title="Reset Password" onPress={handleVerifyAndReset} loading={isLoading} size="lg" />
            </View>
          )}

          <Button
            title="Back to Sign In"
            onPress={() => navigation.navigate('SignIn')}
            variant="ghost"
            style={styles.backButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  flex: {flex: 1},
  scrollContent: {flexGrow: 1, padding: spacing.xl, justifyContent: 'center'},
  header: {alignItems: 'center', marginBottom: spacing.xxl},
  title: {...typography.h2, color: colors.text, marginBottom: spacing.sm},
  subtitle: {...typography.body, color: colors.textSecondary, textAlign: 'center'},
  form: {marginBottom: spacing.xl},
  errorBanner: {backgroundColor: colors.dangerLight, padding: spacing.md, borderRadius: 8, marginBottom: spacing.base},
  errorText: {...typography.bodySmall, color: colors.danger},
  backButton: {marginTop: spacing.md},
});
