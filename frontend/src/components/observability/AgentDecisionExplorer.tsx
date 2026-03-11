import { useEffect, useState, useCallback } from 'react'
import {
  Brain,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Shield,
  BarChart3,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Users,
  Clock,
  Zap,
  Info
} from 'lucide-react'
import api from '../../utils/api'
import { clsx } from 'clsx'

// ── Types ──────────────────────────────────────────────────────────

interface FeatureContribution {
  feature: string
  value: number
  contribution: number
  direction: 'positive' | 'negative'
  baseline?: number
  percentile?: number
  category?: string
}

interface CounterfactualAnalysis {
  domain: string
  current_score: number
  needed_score: number
  change_pct: number
  result: string
  actionable: boolean
}

interface Attribution {
  agent_name: string
  patient_id: string
  decision: string
  final_score: number
  risk_level: string
  contributions: FeatureContribution[]
  confidence_interval: [number, number]
  top_drivers: string[]
  counterfactual_analysis: CounterfactualAnalysis[]
  natural_language_explanation: string
}

interface TierExplanation {
  tier: string
  tier_name: string
  agents_involved: string[]
  summary: string
  confidence: number
  duration_ms: number
  alerts_generated: number
}

interface PipelineExplanation {
  patient_id: string
  pipeline_name: string
  final_decision: string
  final_risk_level: string
  final_score: number
  tier_explanations: TierExplanation[]
  evidence_chain: Array<{ source: string; level: string }>
  hitl_decisions: Array<{ decision: string; notes: string }>
  safety_checks: Array<{ tier: string; agent: string; flags: string[] }>
  total_duration_ms: number
  patient_summary: string
  clinician_summary: string
}

interface ModelCard {
  identity: {
    agent_name: string
    agent_id: number
    version: string
    agent_tier: string
    last_updated: string
  }
  overview: {
    description: string
    intended_use: string
    out_of_scope_uses: string[]
    primary_users: string[]
  }
  performance: Record<string, number | Record<string, number>>
  safety: {
    considerations: string[]
    known_limitations: string[]
    failure_modes: string[]
    hitl_requirements: string
  }
  fairness: Array<{
    group_by: string
    disparity_ratio: number
    assessment: string
    subgroups: Array<{ group: string; n: number; flagged_rate: number }>
  }>
  clinical: {
    evidence_level: string
    source_guidelines: string[]
  }
}

// ── Risk level styling ─────────────────────────────────────────────

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  MEDIUM: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300' },
  LOW: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
}

const TIER_COLORS: Record<string, string> = {
  tier1: 'bg-blue-100 text-blue-800',
  tier2: 'bg-purple-100 text-purple-800',
  tier3: 'bg-orange-100 text-orange-800',
  tier4: 'bg-red-100 text-red-800',
  tier5: 'bg-green-100 text-green-800',
}

// ── Main Component ─────────────────────────────────────────────────

export default function AgentDecisionExplorer() {
  const [activeTab, setActiveTab] = useState<'attribution' | 'pipeline' | 'model-cards'>('attribution')
  const [attribution, setAttribution] = useState<Attribution | null>(null)
  const [pipelineExplanation, setPipelineExplanation] = useState<PipelineExplanation | null>(null)
  const [modelCards, setModelCards] = useState<ModelCard[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [selectedCard, setSelectedCard] = useState<ModelCard | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['contributions']))
  const [loading, setLoading] = useState(false)
  const [patientId, setPatientId] = useState('')

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }, [])

  // Fetch data on tab change
  useEffect(() => {
    if (activeTab === 'model-cards') {
      fetchModelCards()
    }
  }, [activeTab])

  const fetchAttribution = async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const res = await api.get(`/api/agents/explainability/attribution/${patientId}/`)
      setAttribution(res.data)
    } catch {
      // Use demo data
      setAttribution(DEMO_ATTRIBUTION)
    } finally {
      setLoading(false)
    }
  }

  const fetchPipelineExplanation = async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const res = await api.get(`/api/agents/explainability/pipeline/${patientId}/`)
      setPipelineExplanation(res.data)
    } catch {
      setPipelineExplanation(DEMO_PIPELINE)
    } finally {
      setLoading(false)
    }
  }

  const fetchModelCards = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/agents/model-cards/')
      setModelCards(res.data)
    } catch {
      setModelCards(DEMO_MODEL_CARDS)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Agent Decision Explorer</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Patient ID..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => {
              if (activeTab === 'attribution') fetchAttribution()
              else if (activeTab === 'pipeline') fetchPipelineExplanation()
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            <Eye className="h-4 w-4" />
            Explain
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'attribution', label: 'Feature Attribution', icon: BarChart3 },
          { key: 'pipeline', label: 'Pipeline Explanation', icon: Activity },
          { key: 'model-cards', label: 'Model Cards', icon: FileText },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium',
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      )}

      {/* Feature Attribution Tab */}
      {activeTab === 'attribution' && attribution && !loading && (
        <div className="space-y-6">
          {/* Risk Score Banner */}
          <div className={clsx(
            'p-4 rounded-lg border',
            RISK_COLORS[attribution.risk_level]?.bg,
            RISK_COLORS[attribution.risk_level]?.border
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className={clsx('text-lg font-semibold', RISK_COLORS[attribution.risk_level]?.text)}>
                  {attribution.risk_level} Risk — Score: {attribution.final_score.toFixed(3)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  95% CI: [{attribution.confidence_interval[0].toFixed(3)}, {attribution.confidence_interval[1].toFixed(3)}]
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Agent: {attribution.agent_name}</p>
                <p className="text-sm text-gray-500">Patient: {attribution.patient_id}</p>
              </div>
            </div>
          </div>

          {/* Natural Language Explanation */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Info className="h-4 w-4" />
              Explanation
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {attribution.natural_language_explanation}
            </p>
          </div>

          {/* Feature Contributions */}
          <CollapsibleSection
            title="Feature Contributions"
            icon={<BarChart3 className="h-4 w-4" />}
            expanded={expandedSections.has('contributions')}
            onToggle={() => toggleSection('contributions')}
          >
            <div className="space-y-3">
              {attribution.contributions.map((c, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-40 text-sm text-gray-600 truncate">{c.feature}</div>
                  <div className="flex-1">
                    <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'absolute top-0 left-0 h-full rounded-full transition-all',
                          c.direction === 'negative' ? 'bg-red-400' : 'bg-green-400'
                        )}
                        style={{ width: `${Math.min(c.contribution * 100 / (attribution.final_score || 1) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-32 text-sm">
                    {c.direction === 'negative' ? (
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-green-500" />
                    )}
                    <span className="font-mono">{c.contribution.toFixed(3)}</span>
                    <span className="text-gray-400">({c.value.toFixed(2)})</span>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Counterfactual Analysis */}
          {attribution.counterfactual_analysis.length > 0 && (
            <CollapsibleSection
              title="What Would Change the Outcome?"
              icon={<Zap className="h-4 w-4" />}
              expanded={expandedSections.has('counterfactuals')}
              onToggle={() => toggleSection('counterfactuals')}
            >
              <div className="space-y-3">
                {attribution.counterfactual_analysis.map((cf, i) => (
                  <div key={i} className={clsx(
                    'p-3 rounded-lg border',
                    cf.actionable ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{cf.domain}</span>
                      {cf.actionable && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          Actionable
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Reduce from {cf.current_score.toFixed(3)} to {cf.needed_score.toFixed(3)} ({cf.change_pct.toFixed(0)}% improvement)
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{cf.result}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}

      {/* Pipeline Explanation Tab */}
      {activeTab === 'pipeline' && pipelineExplanation && !loading && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className={clsx(
            'p-4 rounded-lg border',
            RISK_COLORS[pipelineExplanation.final_risk_level]?.bg,
            RISK_COLORS[pipelineExplanation.final_risk_level]?.border
          )}>
            <p className={clsx('text-lg font-semibold', RISK_COLORS[pipelineExplanation.final_risk_level]?.text)}>
              {pipelineExplanation.final_decision}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Total pipeline duration: {pipelineExplanation.total_duration_ms}ms
            </p>
          </div>

          {/* Clinician Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Users className="h-4 w-4" />
              Clinician Summary
            </h3>
            <p className="text-sm text-gray-600">{pipelineExplanation.clinician_summary}</p>
          </div>

          {/* Patient-Facing Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-700 mb-2">
              <Activity className="h-4 w-4" />
              Patient Summary (Health Literacy Level 5)
            </h3>
            <p className="text-sm text-blue-600">{pipelineExplanation.patient_summary}</p>
          </div>

          {/* Tier-by-Tier Breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Tier-by-Tier Reasoning</h3>
            {pipelineExplanation.tier_explanations.map((tier, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={clsx('px-2 py-1 rounded text-xs font-medium', TIER_COLORS[tier.tier] || 'bg-gray-100')}>
                      {tier.tier.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{tier.tier_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {tier.duration_ms}ms
                    </span>
                    <span>Conf: {(tier.confidence * 100).toFixed(0)}%</span>
                    {tier.alerts_generated > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        {tier.alerts_generated} alert(s)
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600">{tier.summary}</p>
                <div className="flex gap-2 mt-2">
                  {tier.agents_involved.map(a => (
                    <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Safety Checks */}
          {pipelineExplanation.safety_checks.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-2">
                <Shield className="h-4 w-4" />
                Safety Flags ({pipelineExplanation.safety_checks.length})
              </h3>
              {pipelineExplanation.safety_checks.map((sc, i) => (
                <div key={i} className="text-sm text-red-600 mt-1">
                  [{sc.tier}] {sc.agent}: {sc.flags.join(', ')}
                </div>
              ))}
            </div>
          )}

          {/* HITL Decisions */}
          {pipelineExplanation.hitl_decisions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700 mb-2">
                <Users className="h-4 w-4" />
                Physician Review Decisions
              </h3>
              {pipelineExplanation.hitl_decisions.map((hd, i) => (
                <div key={i} className="flex items-center gap-2 mt-2">
                  {hd.decision === 'approve' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : hd.decision === 'reject' ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  <span className="text-sm text-gray-600">
                    {hd.decision.toUpperCase()}: {hd.notes || 'No notes'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Model Cards Tab */}
      {activeTab === 'model-cards' && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Registered Agents</h3>
            {modelCards.map((card, i) => (
              <button
                key={i}
                onClick={() => setSelectedCard(card)}
                className={clsx(
                  'w-full text-left p-3 rounded-lg border transition-colors',
                  selectedCard?.identity.agent_name === card.identity.agent_name
                    ? 'bg-indigo-50 border-indigo-300'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{card.identity.agent_name}</span>
                  <span className={clsx(
                    'text-xs px-2 py-0.5 rounded',
                    TIER_COLORS[card.identity.agent_tier.split('_')[0]] || 'bg-gray-100'
                  )}>
                    {card.identity.agent_tier}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">v{card.identity.version} | ID: {card.identity.agent_id}</p>
              </button>
            ))}
          </div>

          {/* Card Detail */}
          <div className="lg:col-span-2">
            {selectedCard ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedCard.identity.agent_name}</h3>
                  <p className="text-sm text-gray-500">
                    Version {selectedCard.identity.version} | Updated {selectedCard.identity.last_updated.split('T')[0]}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Description</h4>
                  <p className="text-sm text-gray-600">{selectedCard.overview.description}</p>
                </div>

                {/* Intended Use */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Intended Use</h4>
                  <p className="text-sm text-gray-600">{selectedCard.overview.intended_use}</p>
                </div>

                {/* Safety */}
                {selectedCard.safety.considerations.length > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Safety Considerations
                    </h4>
                    <ul className="space-y-1">
                      {selectedCard.safety.considerations.map((s, i) => (
                        <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                          <Minus className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Limitations */}
                {selectedCard.safety.known_limitations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Known Limitations</h4>
                    <ul className="space-y-1">
                      {selectedCard.safety.known_limitations.map((l, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <Minus className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Performance */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Performance Metrics</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedCard.performance)
                      .filter(([k, v]) => typeof v === 'number' && v > 0)
                      .map(([key, value]) => (
                        <div key={key} className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-500">{key.replace(/_/g, ' ')}</p>
                          <p className="text-sm font-mono font-medium">
                            {typeof value === 'number' ? value.toFixed(4) : value}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Clinical Evidence */}
                {selectedCard.clinical.source_guidelines.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Clinical Evidence (Level {selectedCard.clinical.evidence_level})
                    </h4>
                    <ul className="space-y-1">
                      {selectedCard.clinical.source_guidelines.map((g, i) => (
                        <li key={i} className="text-sm text-gray-600">{g}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Fairness */}
                {selectedCard.fairness.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Fairness Analysis</h4>
                    {selectedCard.fairness.map((fa, i) => (
                      <div key={i} className="mt-2 bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">By {fa.group_by}</span>
                          <span className={clsx(
                            'text-xs px-2 py-0.5 rounded',
                            fa.assessment === 'pass' ? 'bg-green-100 text-green-700' :
                            fa.assessment === 'flag' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            {fa.assessment.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Disparity ratio: {fa.disparity_ratio.toFixed(3)}</p>
                        <div className="mt-2 space-y-1">
                          {fa.subgroups.map((sg, j) => (
                            <div key={j} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{sg.group}</span>
                              <span className="font-mono">n={sg.n}, flagged={sg.flagged_rate.toFixed(3)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* HITL */}
                {selectedCard.safety.hitl_requirements && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700 mb-1">
                      <Users className="h-4 w-4" />
                      Human-in-the-Loop
                    </h4>
                    <p className="text-sm text-amber-600">{selectedCard.safety.hitl_requirements}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-sm text-gray-400">Select an agent to view its model card</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Collapsible Section Component ──────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          {icon}
          {title}
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// ── Demo Data ──────────────────────────────────────────────────────

const DEMO_ATTRIBUTION: Attribution = {
  agent_name: 'ml_ensemble_agent',
  patient_id: 'P-12345',
  decision: 'CRITICAL risk (score: 0.782)',
  final_score: 0.782,
  risk_level: 'CRITICAL',
  contributions: [
    { feature: 'hospitalization_7d', value: 0.82, contribution: 0.287, direction: 'negative', percentile: 37.1, category: 'domain_score' },
    { feature: 'monitoring_alerts', value: 0.60, contribution: 0.120, direction: 'negative', percentile: 15.3, category: 'domain_score' },
    { feature: 'comorbidity_risk', value: 0.60, contribution: 0.120, direction: 'negative', percentile: 15.3, category: 'domain_score' },
    { feature: 'sdoh_risk', value: 0.45, contribution: 0.068, direction: 'negative', percentile: 8.7, category: 'domain_score' },
    { feature: 'family_history_risk', value: 0.33, contribution: 0.033, direction: 'positive', percentile: 4.2, category: 'domain_score' },
  ],
  confidence_interval: [0.682, 0.882],
  top_drivers: ['hospitalization_7d', 'monitoring_alerts', 'comorbidity_risk'],
  counterfactual_analysis: [
    {
      domain: 'hospitalization_7d',
      current_score: 0.82,
      needed_score: 0.58,
      change_pct: 29.3,
      result: 'Would move patient from CRITICAL to HIGH',
      actionable: true,
    },
    {
      domain: 'monitoring_alerts',
      current_score: 0.60,
      needed_score: 0.14,
      change_pct: 76.7,
      result: 'Would move patient from CRITICAL to HIGH',
      actionable: false,
    },
  ],
  natural_language_explanation: 'The ml_ensemble_agent assessed this patient at CRITICAL risk (score: 0.78/1.00). Primary drivers: hospitalization_7d (0.287, 37% of total), monitoring_alerts (0.120, 15% of total), comorbidity_risk (0.120, 15% of total). To reduce risk to the next level, hospitalization_7d would need to improve from 0.820 to 0.580 (29% improvement).',
}

const DEMO_PIPELINE: PipelineExplanation = {
  patient_id: 'P-12345',
  pipeline_name: 'patient_monitoring_pipeline',
  final_decision: 'CRITICAL risk — score 0.782',
  final_risk_level: 'CRITICAL',
  final_score: 0.782,
  tier_explanations: [
    {
      tier: 'tier1', tier_name: 'Vital Signs Monitoring',
      agents_involved: ['glucose_agent', 'cardiac_agent', 'spo2_agent'],
      summary: 'SpO2 dropped to 88% (below critical threshold 90%). Heart rate elevated at 105 bpm.',
      confidence: 0.98, duration_ms: 105, alerts_generated: 2,
    },
    {
      tier: 'tier2', tier_name: 'Diagnostic Analysis',
      agents_involved: ['lab_agent', 'ecg_agent'],
      summary: 'CRP 45mg/L (normal <5), trending up 3x in 48h. NT-proBNP elevated at 2450 pg/mL.',
      confidence: 0.91, duration_ms: 52, alerts_generated: 1,
    },
    {
      tier: 'tier3', tier_name: 'Risk Assessment',
      agents_involved: ['prediction_agent', 'ml_ensemble_agent'],
      summary: 'Unified risk score 0.782 (CRITICAL). Top drivers: hospitalization risk (37%), monitoring alerts (15%).',
      confidence: 0.85, duration_ms: 89, alerts_generated: 1,
    },
    {
      tier: 'tier4', tier_name: 'Clinical Intervention',
      agents_involved: ['prescription_agent', 'contraindication_agent'],
      summary: 'Recommend Lisinopril uptitration 10mg→20mg per ACC/AHA 2023. No contraindications found.',
      confidence: 0.91, duration_ms: 34, alerts_generated: 0,
    },
  ],
  evidence_chain: [
    { source: 'ADA Standards of Care 2024', level: 'A' },
    { source: 'ACC/AHA 2023 Heart Failure Guidelines', level: 'A' },
  ],
  hitl_decisions: [
    { decision: 'approve', notes: 'Agree with uptitration, start at 15mg instead of 20mg' },
  ],
  safety_checks: [
    { tier: 'tier1', agent: 'spo2_agent', flags: ['critical_low_spo2'] },
  ],
  total_duration_ms: 280,
  clinician_summary: 'Immediate clinical intervention required. Hospital observation or same-day urgent evaluation. Unified risk score: 0.78/1.00. Vital Signs Monitoring: 2 alert(s) — SpO2 dropped to 88%. Evidence base: ADA Standards of Care 2024, ACC/AHA 2023.',
  patient_summary: 'Your health readings need urgent attention. Your care team has been notified and will contact you shortly. We noticed some changes in your vital signs that we want to keep an eye on.',
}

const DEMO_MODEL_CARDS: ModelCard[] = [
  {
    identity: { agent_name: 'ml_ensemble_agent', agent_id: 14, version: '1.0.0', agent_tier: 'tier3_risk', last_updated: '2026-03-11T00:00:00Z' },
    overview: {
      description: 'Multi-modal ML ensemble combining 5 risk domains using attention-weighted fusion to generate unified patient risk scores.',
      intended_use: 'Unified risk stratification for chronic care patients. Generates tiered risk levels with explainable domain contributions.',
      out_of_scope_uses: ['Acute emergency triage', 'Pediatric risk assessment'],
      primary_users: ['Care coordinators', 'Population health managers'],
    },
    performance: { auc_roc: 0.82, calibration_error: 0.05, avg_latency_ms: 89, p95_latency_ms: 150, precision: 0, recall: 0, f1_score: 0, accuracy: 0, error_rate: 0 },
    safety: {
      considerations: ['Emergency override forces minimum score to 0.70', 'CRITICAL risk always triggers physician notification within 15 min'],
      known_limitations: ['Domain weights are static', 'Missing domain data treated as 0 risk'],
      failure_modes: ['Missing domain data → underestimated risk'],
      hitl_requirements: 'CRITICAL risk decisions require physician approval before Tier 5 actions execute.',
    },
    fairness: [
      {
        group_by: 'sex',
        disparity_ratio: 1.08,
        assessment: 'pass',
        subgroups: [
          { group: 'M', n: 200, flagged_rate: 0.42 },
          { group: 'F', n: 180, flagged_rate: 0.39 },
        ],
      },
    ],
    clinical: { evidence_level: 'B', source_guidelines: ['LACE+ Index', 'HOSPITAL Score', 'Charlson Comorbidity Index'] },
  },
  {
    identity: { agent_name: 'glucose_monitoring_agent', agent_id: 1, version: '1.0.0', agent_tier: 'tier1_monitoring', last_updated: '2026-03-11T00:00:00Z' },
    overview: {
      description: 'Monitors blood glucose levels from CGM and point-of-care testing. Detects hypo/hyperglycemia and trend analysis.',
      intended_use: 'Real-time glucose monitoring for diabetes patients.',
      out_of_scope_uses: ['Insulin dosing decisions'],
      primary_users: ['Endocrinologists', 'Primary care physicians'],
    },
    performance: { avg_latency_ms: 45, precision: 0, recall: 0, f1_score: 0, accuracy: 0, auc_roc: 0, calibration_error: 0, p95_latency_ms: 0, error_rate: 0 },
    safety: {
      considerations: ['False negatives for hypoglycemia can be life-threatening', 'CGM lag of 5-15 minutes'],
      known_limitations: ['Does not account for insulin-on-board', 'Accuracy degrades for glucose > 400 mg/dL'],
      failure_modes: [],
      hitl_requirements: '',
    },
    fairness: [],
    clinical: { evidence_level: 'A', source_guidelines: ['ADA Standards of Care 2024, Section 7'] },
  },
]
