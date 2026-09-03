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
import {validateEmail} from '../../utils/helpers';

export function SignInScreen({navigation}: {navigation: any}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<string | undefined>();
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  const {login, isLoading} = useAuthStore();

  const validate = () => {
    const newErrors: {email?: string; password?: string} = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!validateEmail(email)) newErrors.email = 'Invalid email address';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    const result = await login(email.trim(), password, userType);
    if (result.needsAccountType && result.availableTypes) {
      setAvailableTypes(result.availableTypes);
      setShowTypeSelector(true);
    } else if (!result.success && result.message) {
      setErrors({password: result.message});
    }
  };

  const handleTypeSelect = (type: string) => {
    setUserType(type);
    setShowTypeSelector(false);
    // Re-login with selected type
    login(email.trim(), password, type);
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
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          {showTypeSelector ? (
            <View style={styles.typeSelector}>
              <Text style={styles.typeSelectorTitle}>
                Multiple accounts found. Select account type:
              </Text>
              {availableTypes.map(type => (
                <TouchableOpacity
                  key={type}
                  style={styles.typeOption}
                  onPress={() => handleTypeSelect(type)}>
                  <Text style={styles.typeOptionText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.form}>
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
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                error={errors.password}
              />

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={isLoading}
                size="lg"
                style={styles.loginButton}
              />
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    marginBottom: spacing.xl,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  forgotPasswordText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  footerLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  typeSelector: {
    marginBottom: spacing.xl,
  },
  typeSelectorTitle: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  typeOption: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeOptionText: {
    ...typography.button,
    color: colors.primary,
  },
});
