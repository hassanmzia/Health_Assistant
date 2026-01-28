export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    queryType?: string
    sql?: string
    status?: string
    requiresApproval?: boolean
  }
}

export interface ApprovalTask {
  taskId: string
  sessionId: string
  naturalLanguageQuery: string
  generatedSql: string
  queryType: string
  riskScore: number
  riskAssessment: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  createdAt: string
  expiresAt?: string
}

export interface QueryResult {
  sessionId: string
  status: string
  queryType?: string
  result?: string
  error?: string
}

export interface AuditEntry {
  id: number
  timestamp: string
  userId: string
  query: string
  queryType: string
  status: string
  sql?: string
}

export interface AgentInfo {
  name: string
  description: string
  capabilities: string[]
  status: 'active' | 'inactive'
}
