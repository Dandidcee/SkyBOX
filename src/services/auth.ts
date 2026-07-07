import api from './api';

export interface User {
  id: string;
  email: string;
}

export interface Session {
  token: string;
  user: User;
}

export async function getSession(): Promise<Session | null> {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (token && userStr) {
    try {
      return { token, user: JSON.parse(userStr) };
    } catch {
      return null;
    }
  }
  return null;
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session ? session.user : null;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const { data } = await api.post('/auth/login', { email, password });
  if (data.token && data.user) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    notifyAuthChange('SIGNED_IN', { token: data.token, user: data.user });
    return data;
  }
  throw new Error('Login gagal');
}

export async function signOut(): Promise<void> {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

// Dummy untuk signup/reset karena backend baru belum full support
export async function signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const { data } = await api.post('/auth/register', { email, password });
  if (data.success) {
    return { needsConfirmation: false }; // Kita otomatis approve karena ini internal
  }
  throw new Error('Gagal mendaftar');
}

export async function resetPassword(): Promise<void> {
  throw new Error("Belum diimplementasikan");
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { data } = await api.put('/auth/password', { password: newPassword });
  if (!data.success) {
    throw new Error('Gagal update password');
  }
}

let authListeners: ((event: string, session: Session | null) => void)[] = [];

export function notifyAuthChange(event: string, session: Session | null) {
  authListeners.forEach((cb) => cb(event, session));
}

export function onAuthChange(cb: (event: string, session: Session | null) => void): () => void {
  authListeners.push(cb);
  return () => {
    authListeners = authListeners.filter((l) => l !== cb);
  };
}
