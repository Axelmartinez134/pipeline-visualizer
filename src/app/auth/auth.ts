const AUTH_KEY = 'outreachai.authed';

export function isAuthed(): boolean {
  try {
    return window.localStorage.getItem(AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAuthed(value: boolean) {
  try {
    window.localStorage.setItem(AUTH_KEY, value ? 'true' : 'false');
  } catch {
    // ignore
  }
}

