import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { useStore } from '../../store'
import { useAuthStore } from '../../store/authStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import { generateUUID } from '../../utils/uuid'
import ChatMessage from './ChatMessage'
import HITLApprovalPanel from '../hitl/HITLApprovalPanel'

export default function ChatPage() {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, isLoading, sessionId, currentApproval, addMessage } = useStore()
  const { user } = useAuthStore()
  const userId = user?.username || 'anonymous'
  const { sendQuery } = useWebSocket()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Add user message
    addMessage({
      id: generateUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    })

    // Send to backend
    sendQuery(input, sessionId, userId)
    setInput('')
  }

  const exampleQueries = [
    "How many active patients are in the database?",
    "List conditions for patients over 50",
    "Show top 10 most common diagnoses",
    "What are the most prescribed medications?",
    "Show all emergency encounters from the last 30 days",
    "List patients with active allergies to medications",
    "Show vital signs observations with abnormal results",
    "How many patients are on more than 3 active medications?",
    "List all completed procedures grouped by type",
    "Show patient demographics breakdown by gender and age group",
  ]

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-7rem)] sm:h-[calc(100vh-8rem)] min-w-0 overflow-hidden">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 px-2">
              <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">Healthcare Intelligence Assistant</h3>
              <p className="text-xs sm:text-sm mb-4 sm:mb-6 text-center">Ask questions about patient data in natural language</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full">
                {exampleQueries.map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(query)}
                    className="text-left text-sm p-3 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about patient data..."
              disabled={isLoading}
              className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* HITL Panel (shown when approval needed) */}
      {currentApproval && (
        <div className="w-full md:w-80 shrink-0 overflow-y-auto">
          <HITLApprovalPanel approval={currentApproval} />
        </div>
      )}
    </div>
  )
}
