import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ThemeStore } from '@/types'

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        set({ theme })
        
        // Apply theme to document
        const root = document.documentElement
        root.classList.remove('light', 'dark')
        
        root.classList.add(theme)
      },
      toggleTheme: () => {
        const current = get().theme
        const newTheme = current === 'light' ? 'dark' : 'light'
        get().setTheme(newTheme)
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)

// Client-side theme initialization
export const initializeTheme = () => {
  if (typeof window === 'undefined') return
  
  // Apply initial theme
  const initialTheme = useThemeStore.getState().theme
  useThemeStore.getState().setTheme(initialTheme)
}