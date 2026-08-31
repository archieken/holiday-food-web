export interface AuthUser {
  email: string
  name: string | null
  picture: string | null
  admin: boolean
}

// Holds either a Google id token or a local email/password account's session token - the
// API tells them apart on its side, so the frontend just treats it as an opaque bearer token.
const STORAGE_KEY = 'googleIdToken'

/**
 * Sign-in state (Google or a local email/password account), lifted out of any single
 * component via useState() so the nav bar and every page agree on who's signed in. The
 * token is the only thing that matters for authorization - it's re-verified by the API on
 * every admin request - `user` here is just for display and for showing/hiding admin-only
 * buttons.
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

  async function signIn(token: string) {
    idToken.value = token
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, token)
    authError.value = ''
    await refreshUser()
  }

  /** The callback Google's Sign-In button invokes with a fresh id token. */
  async function handleCredentialResponse(response: { credential: string }) {
    await signIn(response.credential)
  }

  async function registerWithEmail(email: string, password: string, name: string) {
    const { token } = await $fetch<{ token: string }>('/api/auth/register', {
      method: 'POST',
      body: { email, password, name }
    })
    await signIn(token)
  }

  async function loginWithEmail(email: string, password: string) {
    const { token } = await $fetch<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    await signIn(token)
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

  return {
    idToken,
    user,
    authError,
    restoreFromStorage,
    refreshUser,
    handleCredentialResponse,
    registerWithEmail,
    loginWithEmail,
    signOut,
    authHeaders
  }
}
