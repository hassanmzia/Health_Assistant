export interface UserProfile {
  role: string
  phone: string
  department: string
}

export interface AuthUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  role: string
  date_joined: string
  profile: UserProfile
}

export interface AuthTokens {
  access: string
  refresh: string
}

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
