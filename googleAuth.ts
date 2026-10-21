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
export const createGoogleAuthProvider = (forceSelectAccount: boolean = true, includeDriveScopes: boolean = true): GoogleAuthProvider => {
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
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken || '');
    } else {
      cachedAccessToken = null;
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
    const provider = createGoogleAuthProvider(options?.forceSelectAccount ?? true, options?.includeDriveScopes ?? true);
    if (options?.prompt) {
      provider.setCustomParameters({ prompt: options.prompt });
    }
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken || '' };
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
    if (error?.message && (error.message.includes('access_denied') || error.message.includes('403'))) {
      throw new Error('Acesso negado pelo Google (403). Verifique as permissões de usuário ou tela de consentimento.');
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
  return await signInWithGoogle({ forceSelectAccount: true, includeDriveScopes: true });
};

/**
 * Prompts user to grant Google Sheets / Drive permissions for spreadsheet sync.
 */
export const requestGoogleSheetsAccess = async (): Promise<{ user: User; accessToken: string } | null> => {
  return await signInWithGoogle({ forceSelectAccount: false, includeDriveScopes: true, prompt: 'consent' });
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setCachedGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logoutGoogle = async () => {
  cachedAccessToken = null;
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Erro ao deslogar do Firebase Auth:', err);
  }
};

