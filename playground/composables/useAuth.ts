import { ref } from 'vue'

// Global state (shared across all component instances)
const isAuthenticated = ref(false)
const userEmail = ref<string>('')
const isChecking = ref(false)
let checkPromise: Promise<void> | null = null

export const useAuth = () => {
  const checkAuth = async () => {
    // If already checking, return the existing promise
    if (checkPromise) {
      return checkPromise
    }

    // If already checked and authenticated, skip
    if (isAuthenticated.value && userEmail.value) {
      return
    }

    isChecking.value = true

    checkPromise = (async () => {
      if (typeof window === 'undefined') return

      try {
        const response = await fetch('/api/dashboard', {
          credentials: 'include'
        })

        if (!response.ok) {
          isAuthenticated.value = false
          userEmail.value = ''
          return
        }

        const data = await response.json()
        if (data.user && data.user.email) {
          isAuthenticated.value = true
          userEmail.value = data.user.email
        } else {
          isAuthenticated.value = false
          userEmail.value = ''
        }
      } catch (error) {
        isAuthenticated.value = false
        userEmail.value = ''
      } finally {
        isChecking.value = false
        checkPromise = null
      }
    })()

    return checkPromise
  }

  const logout = () => {
    isAuthenticated.value = false
    userEmail.value = ''
  }

  return {
    isAuthenticated,
    userEmail,
    isChecking,
    checkAuth,
    logout
  }
}

