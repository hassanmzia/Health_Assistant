import { useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useStore } from '../store'
import { ApprovalTask } from '../types'
import { generateUUID } from '../utils/uuid'

const WS_URL = import.meta.env.VITE_WS_URL || `${window.location.protocol}//${window.location.host}`

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null)
  const {
    addMessage,
    setCurrentApproval,
    setConnected,
    setLoading,
  } = useStore()

  const connect = useCallback((sessionId: string) => {
    if (socketRef.current?.connected) {
      return
    }

    const socket = io(WS_URL, {
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      console.log('WebSocket connected')
      setConnected(true)
      socket.emit('join_session', sessionId)
    })

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setConnected(false)
    })

    socket.on('session_joined', (data) => {
      console.log('Joined session:', data.sessionId)
    })

    socket.on('approval_required', (data) => {
      console.log('Approval required:', data)
      setLoading(false)

      const approval: ApprovalTask = {
        taskId: data.taskId || generateUUID(),
        sessionId: data.sessionId,
        naturalLanguageQuery: data.query || '',
        generatedSql: data.generatedSql,
        queryType: data.queryType,
        riskScore: data.riskScore || 0.5,
        riskAssessment: data.riskAssessment || '',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      }

      setCurrentApproval(approval)

      addMessage({
        id: generateUUID(),
        role: 'system',
        content: `**Approval Required**\n\nThis query requires human approval before execution.\n\n**Generated SQL:**\n\`\`\`sql\n${data.generatedSql}\n\`\`\`\n\n**Risk Assessment:** ${data.riskAssessment}`,
        timestamp: new Date(),
        metadata: {
          queryType: data.queryType,
          sql: data.generatedSql,
          requiresApproval: true,
        },
      })
    })

    socket.on('query_result', (data) => {
      console.log('Query result:', data)
      setLoading(false)
      setCurrentApproval(null)

      addMessage({
        id: generateUUID(),
        role: 'assistant',
        content: data.result || 'Query completed.',
        timestamp: new Date(),
        metadata: {
          queryType: data.queryType,
          status: data.status,
        },
      })
    })

    socket.on('decision_processed', (data) => {
      console.log('Decision processed:', data)
      setLoading(false)
      setCurrentApproval(null)

      const statusEmoji = data.decision === 'APPROVED' ? '✓' : '✗'
      addMessage({
        id: generateUUID(),
        role: 'system',
        content: `**Decision: ${data.decision}** ${statusEmoji}\n\nReviewer: ${data.reviewerId}\n\n${data.result || ''}`,
        timestamp: new Date(),
        metadata: {
          status: data.status,
        },
      })
    })

    socket.on('error', (data) => {
      console.error('WebSocket error:', data)
      setLoading(false)

      addMessage({
        id: generateUUID(),
        role: 'system',
        content: `**Error:** ${data.message}`,
        timestamp: new Date(),
      })
    })

    socketRef.current = socket
  }, [addMessage, setCurrentApproval, setConnected, setLoading])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  const sendQuery = useCallback((query: string, sessionId: string, userId: string) => {
    if (socketRef.current?.connected) {
      setLoading(true)
      socketRef.current.emit('submit_query', { query, sessionId, userId })
    }
  }, [setLoading])

  const sendDecision = useCallback((
    sessionId: string,
    decision: 'APPROVED' | 'REJECTED',
    reviewerId: string,
    notes: string = ''
  ) => {
    if (socketRef.current?.connected) {
      setLoading(true)
      socketRef.current.emit('submit_decision', {
        sessionId,
        decision,
        reviewerId,
        notes,
      })
    }
  }, [setLoading])

  return {
    connect,
    disconnect,
    sendQuery,
    sendDecision,
    isConnected: socketRef.current?.connected || false,
  }
}
