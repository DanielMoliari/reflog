import { create } from 'zustand'

interface UpgradeModalStore {
  open: boolean
  headline: string | null
  openModal: (headline?: string) => void
  closeModal: () => void
}

export const useUpgradeModalStore = create<UpgradeModalStore>((set) => ({
  open: false,
  headline: null,
  openModal: (headline) => set({ open: true, headline: headline ?? null }),
  closeModal: () => set({ open: false }),
}))
