import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SidebarStore } from '@/types'

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isCollapsed: false,
      activeTab: 'history',
      selectedProject: null,
      
      setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      setSelectedProject: (projectId) => set({ selectedProject: projectId }),
    }),
    {
      name: 'sidebar-storage',
      partialize: (state) => ({
        isCollapsed: state.isCollapsed,
        activeTab: state.activeTab,
        selectedProject: state.selectedProject,
      }),
    }
  )
)