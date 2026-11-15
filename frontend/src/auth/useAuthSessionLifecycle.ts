import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/authApi'
import { getSessionToken, useAuthSession } from './authSession'

export function useAuthSessionLifecycle() {
  const queryClient = useQueryClient()
  const token = useAuthSession(state => state.accessToken)
  const expiresAt = useAuthSession(state => state.expiresAt)
  const attempt = useAuthSession(state => state.restoreAttempt)

  useEffect(() => useAuthSession.subscribe((state, previous) => {
    if ((previous.accessToken && previous.accessToken !== state.accessToken)
      || (previous.user && previous.user.id !== state.user?.id)) queryClient.clear()
  }), [queryClient])

  useEffect(() => {
    if (!token || useAuthSession.getState().status !== 'checking' || !getSessionToken()) return
    const controller = new AbortController()
    void authApi.getCurrentUser(token, controller.signal).then(user => {
      if (!controller.signal.aborted) useAuthSession.getState().restoreUser(token, user)
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        useAuthSession.getState().failRestore(token, error instanceof Error ? error.message : 'Не удалось проверить вход. Повторите попытку.')
      }
    })
    return () => controller.abort()
  }, [token, attempt])

  useEffect(() => {
    if (!token || !expiresAt) return
    let timer: number | undefined
    function checkExpiry() {
      const state = useAuthSession.getState()
      if (state.accessToken !== token || state.expiresAt !== expiresAt) return
      const remaining = expiresAt! - Date.now()
      if (remaining <= 0) state.logout('expired')
      else timer = window.setTimeout(checkExpiry, Math.min(remaining, 2147483647))
    }
    function onFocus() {
      if (timer !== undefined) window.clearTimeout(timer)
      checkExpiry()
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') onFocus()
    }
    checkExpiry()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [token, expiresAt])
}
