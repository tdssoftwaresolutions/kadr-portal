import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuthStore} from '../../store/authStore';
import {Button, Input} from '../../components/common';
import {colors, typography, spacing} from '../../theme';
import {validateEmail, validatePassword, validatePhone} from '../../utils/helpers';

type SignupType = 'CLIENT' | 'MEDIATOR';

export function SignUpScreen({navigation}: {navigation: any}) {
  const [signupType, setSignupType] = useState<SignupType>('CLIENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {newUserSignup, newMediatorSignup, isLoading} = useAuthStore();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email) newErrors.email = 'Email is required';
    else if (!validateEmail(email)) newErrors.email = 'Invalid email';
    if (!phone) newErrors.phone = 'Phone number is required';
    else if (!validatePhone(phone)) newErrors.phone = 'Invalid phone number';
    if (!password) newErrors.password = 'Password is required';
    else {
      const pwResult = validatePassword(password);
      if (!pwResult.valid) newErrors.password = pwResult.message || 'Invalid';
    }
    if (password !== confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';
    if (signupType === 'MEDIATOR' && !city.trim())
      newErrors.city = 'City is required for mediators';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    const userDetails = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone_number: phone.trim(),
      password,
      city: city.trim(),
    };

    let result;
    if (signupType === 'CLIENT') {
      result = await newUserSignup(userDetails);
    } else {
      result = await newMediatorSignup(userDetails);
    }

    if (result.success) {
      navigation.navigate('SignIn');
    } else if (result.message) {
      setErrors({general: result.message});
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>Kadr</Text>
            <Text style={styles.subtitle}>Create your account</Text>
          </View>

          {/* Account type toggle */}
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[
                styles.typeTab,
                signupType === 'CLIENT' && styles.typeTabActive,
              ]}
              onPress={() => setSignupType('CLIENT')}>
              <Text
                style={[
                  styles.typeTabText,
                  signupType === 'CLIENT' && styles.typeTabTextActive,
                ]}>
                Client
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeTab,
                signupType === 'MEDIATOR' && styles.typeTabActive,
              ]}
              onPress={() => setSignupType('MEDIATOR')}>
              <Text
                style={[
                  styles.typeTabText,
                  signupType === 'MEDIATOR' && styles.typeTabTextActive,
                ]}>
                Mediator
              </Text>
            </TouchableOpacity>
          </View>

          {errors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              error={errors.name}
            />
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <Input
              label="Phone Number"
              placeholder="Enter 10-digit phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              error={errors.phone}
            />
            {signupType === 'MEDIATOR' && (
              <Input
                label="City"
                placeholder="Enter your city"
                value={city}
                onChangeText={setCity}
                autoCapitalize="words"
                error={errors.city}
              />
            )}
            <Input
              label="Password"
              placeholder="Min 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errors.password}
            />
            <Input
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              error={errors.confirmPassword}
            />

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={isLoading}
              size="lg"
              style={styles.signupButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  flex: {flex: 1},
  scrollContent: {flexGrow: 1, padding: spacing.xl},
  header: {alignItems: 'center', marginBottom: spacing.xl},
  logo: {fontSize: 36, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm},
  subtitle: {...typography.body, color: colors.textSecondary},
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.xl,
  },
  typeTab: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  typeTabActive: {backgroundColor: colors.surface},
  typeTabText: {...typography.button, color: colors.textSecondary},
  typeTabTextActive: {color: colors.primary},
  form: {marginBottom: spacing.xl},
  signupButton: {marginTop: spacing.md},
  footer: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs},
  footerText: {...typography.bodySmall, color: colors.textSecondary},
  footerLink: {...typography.bodySmall, color: colors.primary, fontWeight: '600'},
  errorBanner: {
    backgroundColor: colors.dangerLight,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.base,
  },
  errorBannerText: {...typography.bodySmall, color: colors.danger},
});
