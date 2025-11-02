// Copy to clipboard composable
export const useCopyToClipboard = () => {
  const { success, error } = useToast()
  const copied = ref(false)
  let timeoutId: NodeJS.Timeout | null = null

  const copy = async (text: string, successMessage = 'Copied to clipboard!') => {
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      success(successMessage)

      // Reset after 2 seconds
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch (err) {
      error('Failed to copy to clipboard')
      console.error('Copy failed:', err)
    }
  }

  return {
    copy,
    copied
  }
}

