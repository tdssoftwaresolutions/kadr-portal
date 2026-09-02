import * as Keychain from 'react-native-keychain';

const ACCESS_TOKEN_KEY = 'kadr_access_token';
const REFRESH_TOKEN_KEY = 'kadr_refresh_token';

export async function getAccessToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: ACCESS_TOKEN_KEY,
    });
    if (credentials) {
      return credentials.password;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: REFRESH_TOKEN_KEY,
    });
    if (credentials) {
      return credentials.password;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setTokens({
  accessToken,
  refreshToken,
}: {
  accessToken?: string;
  refreshToken?: string;
}): Promise<void> {
  try {
    if (accessToken) {
      await Keychain.setGenericPassword('kadr_user', accessToken, {
        service: ACCESS_TOKEN_KEY,
      });
    }
    if (refreshToken) {
      await Keychain.setGenericPassword('kadr_user', refreshToken, {
        service: REFRESH_TOKEN_KEY,
      });
    }
  } catch (error) {
    console.error('[tokenStorage] Failed to set tokens:', error);
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({service: ACCESS_TOKEN_KEY});
    await Keychain.resetGenericPassword({service: REFRESH_TOKEN_KEY});
  } catch (error) {
    console.error('[tokenStorage] Failed to clear tokens:', error);
  }
}

export async function hasStoredSession(): Promise<boolean> {
  const access = await getAccessToken();
  if (access) return true;
  const refresh = await getRefreshToken();
  return !!refresh;
}
