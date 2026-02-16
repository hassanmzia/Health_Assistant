import { useEffect, useState } from 'react'
import { Bot, Activity, Cpu, Zap, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import api from '../../utils/api'
import { clsx } from 'clsx'
import WorkflowDiagram from './WorkflowDiagram'

// Default agent definitions (these are static and well-known)
const DEFAULT_AGENTS: Agent[] = [
  {
    name: 'sql_agent',
    description: 'Generates SQL from natural language',
    capabilities: ['generate_sql', 'validate_sql', 'optimize_sql']
  },
  {
    name: 'classifier_agent',
    description: 'Classifies queries and assesses risk',
    capabilities: ['classify_query', 'assess_risk', 'check_guardrails']
  },
  {
    name: 'hitl_agent',
    description: 'Manages human-in-the-loop approvals',
    capabilities: ['request_approval', 'process_decision', 'escalate']
  },
  {
    name: 'executor_agent',
    description: 'Executes SQL and formats results',
    capabilities: ['execute_query', 'format_results', 'handle_errors']
  },
  {
    name: 'presenter_agent',
    description: 'Summarizes results in natural language',
    capabilities: ['summarize', 'format', 'highlight_important']
  }
]

interface Agent {
  name: string
  description: string
  capabilities: string[]
}

interface AgentInteraction {
  id: number
  timestamp: string
  session_id: string
  sender_agent: string
  receiver_agent: string
  message_type: string
  capability: string
  duration_ms: number
  success: boolean
}

interface AgentStats {
  total_interactions: number
  success_rate: number
  avg_duration_ms: number
  by_agent: Record<string, number>
}

export default function AgentMonitoringPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [interactions, setInteractions] = useState<AgentInteraction[]>([])
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [agentHealth, setAgentHealth] = useState<Record<string, 'healthy' | 'unhealthy' | 'unknown'>>({})
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      // Use default agents list
      setAgents(DEFAULT_AGENTS)

      // Fetch agent interactions from backend
      const interactionsResponse = await api.get('/agents/interactions/').catch(() => null)
      if (interactionsResponse?.data) {
        setInteractions(interactionsResponse.data.slice(0, 50))
      }

      // Fetch agent stats
      const statsResponse = await api.get('/agents/stats/').catch(() => null)
      if (statsResponse?.data) {
        setStats(statsResponse.data)

        // Determine agent health based on recent activity
        const health: Record<string, 'healthy' | 'unhealthy' | 'unknown'> = {}
        const activeAgents = statsResponse.data.by_agent || {}

        DEFAULT_AGENTS.forEach((agent) => {
          // Check if agent has had any interactions
          // Map receiver_agent names to agent names
          const agentNames = [agent.name, agent.name.replace('_agent', '')]
          const hasActivity = Object.keys(activeAgents).some(key =>
            agentNames.some(name => key.includes(name) || key === 'orchestrator')
          )
          health[agent.name] = hasActivity || statsResponse.data.total_interactions > 0 ? 'healthy' : 'unknown'
        })
        setAgentHealth(health)
      } else {
        // No stats, set all as unknown
        const health: Record<string, 'healthy' | 'unhealthy' | 'unknown'> = {}
        DEFAULT_AGENTS.forEach((agent) => {
          health[agent.name] = 'unknown'
        })
        setAgentHealth(health)
      }
    } catch (error) {
      console.error('Failed to fetch agent data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const getAgentIcon = (agentName: string) => {
    const icons: Record<string, typeof Bot> = {
      sql_agent: Cpu,
      classifier_agent: Activity,
      hitl_agent: CheckCircle2,
      executor_agent: Zap,
      presenter_agent: Bot,
      mcp_server: Activity,
      orchestrator: Bot,
    }
    return icons[agentName] || Bot
  }

  const getAgentColor = (agentName: string) => {
    const colors: Record<string, string> = {
      sql_agent: 'bg-blue-500',
      classifier_agent: 'bg-purple-500',
      hitl_agent: 'bg-amber-500',
      executor_agent: 'bg-green-500',
      presenter_agent: 'bg-pink-500',
      mcp_server: 'bg-cyan-500',
      orchestrator: 'bg-indigo-500',
    }
    return colors[agentName] || 'bg-gray-500'
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
        <div className="flex items-center gap-2 sm:gap-3">
          <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Agent Monitoring</h1>
            <p className="text-sm sm:text-base text-gray-600">Real-time multi-agent system status</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={clsx(
            'flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0',
            'bg-primary-100 text-primary-700 hover:bg-primary-200',
            refreshing && 'opacity-50 cursor-not-allowed'
          )}
        >
          <RefreshCw className={clsx('h-4 w-4', refreshing && 'animate-spin')} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Interactions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_interactions}</p>
              </div>
              <Activity className="h-8 w-8 text-primary-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-success-600">{(stats.success_rate * 100).toFixed(1)}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avg_duration_ms?.toFixed(0) || 0}ms</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Agents</p>
                <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
              </div>
              <Bot className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Agents Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => {
            const Icon = getAgentIcon(agent.name)
            const health = agentHealth[agent.name] || 'unknown'
            return (
              <div
                key={agent.name}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className={clsx('p-2 rounded-lg', getAgentColor(agent.name))}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 truncate">{agent.name}</h3>
                      <span
                        className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          health === 'healthy' && 'bg-success-50 text-success-700',
                          health === 'unhealthy' && 'bg-danger-50 text-danger-700',
                          health === 'unknown' && 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {health === 'healthy' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {health === 'unhealthy' && <XCircle className="h-3 w-3 mr-1" />}
                        {health === 'unknown' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {health}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{agent.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {agent.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* LangGraph Workflow Diagram with Mermaid */}
      <WorkflowDiagram />

      {/* Recent Interactions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Interactions</h2>
        {interactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No agent interactions recorded yet</p>
            <p className="text-sm mt-1">Interactions will appear here as queries are processed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capability
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {interactions.map((interaction) => (
                  <tr key={interaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(interaction.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        'bg-blue-100 text-blue-800'
                      )}>
                        {interaction.sender_agent}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        'bg-purple-100 text-purple-800'
                      )}>
                        {interaction.receiver_agent}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {interaction.capability}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {interaction.duration_ms}ms
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {interaction.success ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-danger-50 text-danger-700">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-sm p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">LangGraph Orchestration</h3>
          <p className="text-blue-100 text-sm">
            The multi-agent system uses LangGraph for stateful workflow management.
            Each agent is a node in the graph, with conditional routing based on
            query classification and risk assessment.
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg shadow-sm p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Agent-to-Agent Protocol</h3>
          <p className="text-purple-100 text-sm">
            Agents communicate via a standardized A2A protocol with capability
            discovery, message routing, and correlation tracking for full
            observability of agent interactions.
          </p>
        </div>
      </div>
    </div>
  )
}
