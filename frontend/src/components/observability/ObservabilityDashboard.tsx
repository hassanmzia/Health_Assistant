import { useEffect, useState } from 'react'
import {
  Eye,
  Activity,
  MessageSquare,
  Brain,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react'
import axios from 'axios'
import { clsx } from 'clsx'

const API_URL = import.meta.env.VITE_API_URL || '/api'

interface Trace {
  id: string
  session_id: string
  timestamp: string
  user_query: string
  total_duration_ms: number
  agents_involved: string[]
  final_status: string
  decisions: Decision[]
  conversations: Conversation[]
}

interface Decision {
  agent: string
  decision: string
  rationale: string
  confidence: number
  timestamp: string
  duration_ms: number
  input_summary: string
  output_summary: string
}

interface Conversation {
  id: number
  timestamp: string
  sender_agent: string
  receiver_agent: string
  capability: string
  message_type: string
  payload: any
  response: any
  duration_ms: number
  success: boolean
}

interface ObservabilityConfig {
  langsmith_enabled: boolean
  langfuse_enabled: boolean
  langsmith_project: string
  langfuse_host: string
}

export default function ObservabilityDashboard() {
  const [traces, setTraces] = useState<Trace[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [config, setConfig] = useState<ObservabilityConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null)
  const [expandedDecisions, setExpandedDecisions] = useState<Set<string>>(new Set())
  const [filterAgent, setFilterAgent] = useState<string>('all')

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      // Fetch observability config
      const configResponse = await axios.get(`${API_URL}/observability/config/`).catch(() => null)
      if (configResponse?.data) {
        setConfig(configResponse.data)
      } else {
        // Default config if endpoint doesn't exist
        setConfig({
          langsmith_enabled: true,
          langfuse_enabled: true,
          langsmith_project: 'healthcare-multi-agent',
          langfuse_host: 'https://cloud.langfuse.com'
        })
      }

      // Fetch traces with decisions
      const tracesResponse = await axios.get(`${API_URL}/observability/traces/`).catch(() => null)
      if (tracesResponse?.data) {
        setTraces(tracesResponse.data)
      }

      // Fetch recent agent conversations
      const conversationsResponse = await axios.get(`${API_URL}/agents/interactions/`).catch(() => null)
      if (conversationsResponse?.data) {
        setConversations(conversationsResponse.data.slice(0, 100))
      }
    } catch (error) {
      console.error('Failed to fetch observability data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const toggleDecision = (id: string) => {
    const newExpanded = new Set(expandedDecisions)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedDecisions(newExpanded)
  }

  const uniqueAgents = Array.from(
    new Set(conversations.flatMap(c => [c.sender_agent, c.receiver_agent]))
  ).filter(Boolean).sort()

  const filteredConversations = filterAgent === 'all'
    ? conversations
    : conversations.filter(c => c.sender_agent === filterAgent || c.receiver_agent === filterAgent)

  const getAgentColor = (agent: string) => {
    const colors: Record<string, string> = {
      orchestrator: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      sql_agent: 'bg-blue-100 text-blue-800 border-blue-200',
      classifier_agent: 'bg-purple-100 text-purple-800 border-purple-200',
      hitl_agent: 'bg-amber-100 text-amber-800 border-amber-200',
      executor_agent: 'bg-green-100 text-green-800 border-green-200',
      presenter_agent: 'bg-pink-100 text-pink-800 border-pink-200',
      mcp_server: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      toxicity_filter: 'bg-red-100 text-red-800 border-red-200',
      guardrail_agent: 'bg-orange-100 text-orange-800 border-orange-200',
    }
    return colors[agent] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Observability & Explainability</h1>
            <p className="text-gray-600">Track agent decisions, traces, and conversations</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            'bg-primary-100 text-primary-700 hover:bg-primary-200',
            refreshing && 'opacity-50 cursor-not-allowed'
          )}
        >
          <RefreshCw className={clsx('h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* External Dashboard Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          href="https://smith.langchain.com"
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            'flex items-center justify-between p-4 rounded-lg border-2 transition-all',
            config?.langsmith_enabled
              ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
              : 'bg-gray-50 border-gray-200 opacity-60'
          )}
        >
          <div className="flex items-center gap-3">
            <div className={clsx(
              'p-2 rounded-lg',
              config?.langsmith_enabled ? 'bg-emerald-500' : 'bg-gray-400'
            )}>
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">LangSmith</h3>
              <p className="text-sm text-gray-600">
                {config?.langsmith_enabled
                  ? `Project: ${config.langsmith_project}`
                  : 'Not configured - add LANGCHAIN_API_KEY'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config?.langsmith_enabled ? (
              <span className="flex items-center text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Active
              </span>
            ) : (
              <span className="flex items-center text-sm text-gray-500">
                <XCircle className="h-4 w-4 mr-1" />
                Disabled
              </span>
            )}
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>
        </a>

        <a
          href={config?.langfuse_host || 'https://cloud.langfuse.com'}
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            'flex items-center justify-between p-4 rounded-lg border-2 transition-all',
            config?.langfuse_enabled
              ? 'bg-violet-50 border-violet-200 hover:border-violet-400'
              : 'bg-gray-50 border-gray-200 opacity-60'
          )}
        >
          <div className="flex items-center gap-3">
            <div className={clsx(
              'p-2 rounded-lg',
              config?.langfuse_enabled ? 'bg-violet-500' : 'bg-gray-400'
            )}>
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Langfuse</h3>
              <p className="text-sm text-gray-600">
                {config?.langfuse_enabled
                  ? 'LLM observability & analytics'
                  : 'Not configured - add LANGFUSE keys'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config?.langfuse_enabled ? (
              <span className="flex items-center text-sm text-violet-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Active
              </span>
            ) : (
              <span className="flex items-center text-sm text-gray-500">
                <XCircle className="h-4 w-4 mr-1" />
                Disabled
              </span>
            )}
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>
        </a>
      </div>

      {/* Decision Rationale Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Decision Rationale & Explainability</h2>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-700">
            <strong>How it works:</strong> Each agent in the workflow logs its decisions with a rationale explaining
            why a particular action was taken. This provides full transparency and accountability for healthcare queries.
          </p>
        </div>

        {/* Sample Decision Flow */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Example Decision Flow:</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={clsx('px-3 py-1 rounded-full border', getAgentColor('toxicity_filter'))}>
              Toxicity Check
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className={clsx('px-3 py-1 rounded-full border', getAgentColor('sql_agent'))}>
              SQL Generation
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className={clsx('px-3 py-1 rounded-full border', getAgentColor('classifier_agent'))}>
              Classification
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className={clsx('px-3 py-1 rounded-full border', getAgentColor('guardrail_agent'))}>
              Guardrails
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className={clsx('px-3 py-1 rounded-full border', getAgentColor('executor_agent'))}>
              Execute
            </span>
          </div>
        </div>

        {/* Recent Decisions from Interactions */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Agent Decisions:</h3>
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Brain className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No decisions recorded yet</p>
              <p className="text-sm mt-1">Submit a query to see agent decisions</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {conversations.slice(0, 20).map((conv) => (
                <div
                  key={conv.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleDecision(String(conv.id))}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedDecisions.has(String(conv.id)) ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-medium border', getAgentColor(conv.receiver_agent))}>
                        {conv.receiver_agent}
                      </span>
                      <span className="text-sm text-gray-700">{conv.capability}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{conv.duration_ms}ms</span>
                      {conv.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </button>

                  {expandedDecisions.has(String(conv.id)) && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Input</p>
                          <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                            {JSON.stringify(conv.payload, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Output / Rationale</p>
                          <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                            {JSON.stringify(conv.response, null, 2)}
                          </pre>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(conv.timestamp).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Agent Conversations Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Agent Conversations</h2>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Agents</option>
              {uniqueAgents.map((agent) => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No agent conversations recorded</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-4">
              {filteredConversations.map((conv, index) => (
                <div key={conv.id} className="relative pl-14">
                  {/* Timeline dot */}
                  <div className={clsx(
                    'absolute left-4 w-4 h-4 rounded-full border-2 border-white',
                    conv.success ? 'bg-green-500' : 'bg-red-500'
                  )} />

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium border', getAgentColor(conv.sender_agent))}>
                          {conv.sender_agent}
                        </span>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <span className={clsx('px-2 py-0.5 rounded text-xs font-medium border', getAgentColor(conv.receiver_agent))}>
                          {conv.receiver_agent}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(conv.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{conv.capability}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{conv.duration_ms}ms</span>
                        {conv.success ? (
                          <span className="text-xs text-green-600">Success</span>
                        ) : (
                          <span className="text-xs text-red-600">Failed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Observability Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5" />
            <h3 className="font-semibold">LangSmith Traces</h3>
          </div>
          <p className="text-emerald-100 text-sm">
            Full LLM traces, token usage, latency metrics, and prompt debugging in the LangSmith dashboard.
          </p>
        </div>

        <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5" />
            <h3 className="font-semibold">Langfuse Analytics</h3>
          </div>
          <p className="text-violet-100 text-sm">
            LLM analytics, cost tracking, user feedback, and evaluation scores in the Langfuse dashboard.
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-sm p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-5 w-5" />
            <h3 className="font-semibold">Decision Logging</h3>
          </div>
          <p className="text-blue-100 text-sm">
            Every agent decision includes rationale, confidence scores, and alternatives considered.
          </p>
        </div>
      </div>
    </div>
  )
}
