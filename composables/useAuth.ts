export interface AuthUser {
  email: string
  name: string | null
  picture: string | null
  admin: boolean
}

const STORAGE_KEY = 'googleIdToken'

/**
 * Google sign-in state, lifted out of any single component via useState() so the nav bar
 * and every page agree on who's signed in. The id token is the only thing that matters for
 * authorization - it's re-verified by the API on every admin request - `user` here is just
 * for display and for showing/hiding admin-only buttons.
 */
export function useAuth() {
  const idToken = useState<string | null>('auth-id-token', () => null)
  const user = useState<AuthUser | null>('auth-user', () => null)
  const authError = useState('auth-error', () => '')

  /** Call once on app mount (client-only) to pick up a token from a previous visit. */
  function restoreFromStorage() {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) idToken.value = stored
  }

  async function refreshUser() {
    if (!idToken.value) {
      user.value = null
      return
    }

    try {
      user.value = await $fetch<AuthUser>('/api/auth/me', {
        headers: { Authorization: `Bearer ${idToken.value}` }
      })
    } catch {
      // Token expired or was rejected - drop it rather than keep retrying with it.
      signOut()
    }
  }

  /** The callback Google's Sign-In button invokes with a fresh id token. */
  async function handleCredentialResponse(response: { credential: string }) {
    idToken.value = response.credential
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, response.credential)
    authError.value = ''
    await refreshUser()
  }

  function signOut() {
    idToken.value = null
    user.value = null
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
  }

  /** Headers to attach to an admin-only request, or {} when signed out. */
  function authHeaders(): Record<string, string> {
    return idToken.value ? { Authorization: `Bearer ${idToken.value}` } : {}
  }

  return { idToken, user, authError, restoreFromStorage, refreshUser, handleCredentialResponse, signOut, authHeaders }
}
