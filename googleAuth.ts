import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { auth } from './firebase';

// Optional Google Workspace scopes (only if user explicitly needs Drive/Sheets sync)
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

/**
 * Creates GoogleAuthProvider configured for mobile & desktop login.
 * Uses standard Google Auth scopes for 100% reliable login across phones and desktops.
 */
export const createGoogleAuthProvider = (forceSelectAccount: boolean = true, includeDriveScopes: boolean = false): GoogleAuthProvider => {
  const provider = new GoogleAuthProvider();
  if (includeDriveScopes) {
    GOOGLE_SCOPES.forEach(scope => provider.addScope(scope));
  }
  if (forceSelectAccount) {
    provider.setCustomParameters({
      prompt: 'select_account',
    });
  }
  return provider;
};

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && !user.isAnonymous) {
      const token = getGoogleAccessToken() || '';
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      setCachedGoogleAccessToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Signs in with Google with account selection enabled by default.
 * Works seamlessly on mobile devices (Android/iOS) and desktop.
 */
export const signInWithGoogle = async (options?: { forceSelectAccount?: boolean; includeDriveScopes?: boolean; prompt?: string }): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const provider = createGoogleAuthProvider(options?.forceSelectAccount ?? true, options?.includeDriveScopes ?? false);
    if (options?.prompt) {
      provider.setCustomParameters({ prompt: options.prompt });
    }
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;
    if (token) {
      setCachedGoogleAccessToken(token);
    }
    return { user: result.user, accessToken: token || '' };
  } catch (error: any) {
    // Normal user cancellation: user closed popup or switched away
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('O navegador do seu celular bloqueou a janela pop-up do Google. Por favor, permita pop-ups nas configurações do navegador para entrar.');
    }
    if (error?.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      const customErr: any = new Error(
        `Domínio não autorizado no Firebase Authentication. O domínio "${currentHost || 'atual'}" precisa ser adicionado na lista de Domínios Autorizados no console do Firebase.`
      );
      customErr.code = 'auth/unauthorized-domain';
      customErr.domain = currentHost;
      throw customErr;
    }
    if (error?.message && (error.message.includes('access_denied') || error.message.includes('403') || error?.code === 'auth/access_denied')) {
      const deniedErr: any = new Error('Acesso bloqueado pelo Google (Erro 403: access_denied). O aplicativo está em modo de teste no Google Cloud e este e-mail precisa ser adicionado como Usuário de Teste pelo administrador do projeto.');
      deniedErr.code = 'OAUTH_ACCESS_DENIED';
      throw deniedErr;
    }
    console.warn('Aviso no login com Google:', error?.message || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Allows switching Google accounts by disconnecting the current session
 * and opening the account chooser for another person to sign in.
 */
export const switchGoogleAccount = async (): Promise<{ user: User; accessToken: string } | null> => {
  await logoutGoogle();
  return await signInWithGoogle({ forceSelectAccount: true, includeDriveScopes: false });
};

/**
 * Prompts user to grant Google Sheets / Drive permissions for spreadsheet sync.
 */
export const requestGoogleSheetsAccess = async (): Promise<{ user: User; accessToken: string } | null> => {
  return await signInWithGoogle({ forceSelectAccount: false, includeDriveScopes: true, prompt: 'consent' });
};

export const getGoogleAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const stored = localStorage.getItem('google_access_token');
    const storedTime = localStorage.getItem('google_access_token_timestamp');
    if (stored && storedTime) {
      const elapsed = Date.now() - parseInt(storedTime, 10);
      // Valid for up to 55 minutes (Google OAuth tokens expire in 60m)
      if (elapsed < 55 * 60 * 1000) {
        cachedAccessToken = stored;
        return stored;
      }
    }
  } catch {}
  return null;
};

export const setCachedGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem('google_access_token', token);
      localStorage.setItem('google_access_token_timestamp', String(Date.now()));
    } else {
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_access_token_timestamp');
    }
  } catch {}
};

export const logoutGoogle = async () => {
  setCachedGoogleAccessToken(null);
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Erro ao deslogar do Firebase Auth:', err);
  }
};

