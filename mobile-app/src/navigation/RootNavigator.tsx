import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {ActivityIndicator, View, StyleSheet, Text} from 'react-native';
import {useAuthStore} from '../store/authStore';
import {AuthNavigator} from './AuthNavigator';
import {MainNavigator} from './MainNavigator';
import {colors} from '../theme/colors';
import {typography} from '../theme/typography';

export function RootNavigator() {
  const {isAuthenticated, isInitializing, initialize} = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isInitializing) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>Kadr</Text>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 24,
  },
  loader: {
    marginTop: 16,
  },
});
