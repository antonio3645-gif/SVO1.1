import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { auth } from './firebase';

// Required Google Workspace scopes
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

/**
 * Creates GoogleAuthProvider configured for multi-account selection.
 * prompt: 'select_account' ensures Google always presents the account chooser,
 * allowing any team member to choose or log in with their own Google account.
 */
export const createGoogleAuthProvider = (forceSelectAccount: boolean = true): GoogleAuthProvider => {
  const provider = new GoogleAuthProvider();
  GOOGLE_SCOPES.forEach(scope => provider.addScope(scope));
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
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Signs in with Google with account selection enabled by default,
 * so each user can select their own account or add a new one.
 */
export const signInWithGoogle = async (options?: { forceSelectAccount?: boolean }): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const provider = createGoogleAuthProvider(options?.forceSelectAccount ?? true);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso da conta Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro no login com Google:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('A janela de login com o Google foi fechada antes de selecionar a conta.');
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error('O navegador bloqueou a janela pop-up do Google. Permita pop-ups para este site para fazer login.');
    }
    if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Operação de login cancelada.');
    }
    if (error.message && (error.message.includes('access_denied') || error.message.includes('403'))) {
      throw new Error('Acesso negado pelo Google (403 / access_denied). Se o projeto estiver em modo de teste no Google Cloud Console, o e-mail deste usuário deve ser cadastrado na lista de "Usuários de teste" da tela de consentimento OAuth.');
    }
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
  return await signInWithGoogle({ forceSelectAccount: true });
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

