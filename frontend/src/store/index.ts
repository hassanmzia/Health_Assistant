import { create } from 'zustand'
import { Message, ApprovalTask } from '../types'

interface AppState {
  // Session
  sessionId: string
  userId: string

  // Messages
  messages: Message[]
  isLoading: boolean

  // HITL
  pendingApprovals: ApprovalTask[]
  currentApproval: ApprovalTask | null

  // Connection
  isConnected: boolean

  // Actions
  setSessionId: (id: string) => void
  setUserId: (id: string) => void
  addMessage: (message: Message) => void
  clearMessages: () => void
  setLoading: (loading: boolean) => void
  setPendingApprovals: (approvals: ApprovalTask[]) => void
  setCurrentApproval: (approval: ApprovalTask | null) => void
  setConnected: (connected: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  // Initial state
  sessionId: crypto.randomUUID(),
  userId: 'user_' + Math.random().toString(36).substr(2, 9),
  messages: [],
  isLoading: false,
  pendingApprovals: [],
  currentApproval: null,
  isConnected: false,

  // Actions
  setSessionId: (id) => set({ sessionId: id }),
  setUserId: (id) => set({ userId: id }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  clearMessages: () => set({ messages: [] }),

  setLoading: (loading) => set({ isLoading: loading }),

  setPendingApprovals: (approvals) => set({ pendingApprovals: approvals }),

  setCurrentApproval: (approval) => set({ currentApproval: approval }),

  setConnected: (connected) => set({ isConnected: connected }),
}))
