import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { RefreshCw, Maximize2, Minimize2 } from 'lucide-react'
import axios from 'axios'
import { clsx } from 'clsx'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// Default LangGraph workflow diagram
const DEFAULT_WORKFLOW_DIAGRAM = `
flowchart TD
    START([Start]) --> fetch_schema[Fetch Schema]
    fetch_schema --> generate_sql[Generate SQL]
    generate_sql --> classify_query[Classify Query]
    classify_query --> check_guardrails[Check Guardrails]

    check_guardrails --> route_decision{Route Decision}

    route_decision -->|READ query| execute_sql[Execute SQL]
    route_decision -->|WRITE query| hitl_gate[HITL Gate]
    route_decision -->|UNSAFE/Violations| handle_rejection[Handle Rejection]

    hitl_gate --> hitl_decision{Human Decision}
    hitl_decision -->|Approved| execute_sql
    hitl_decision -->|Rejected| handle_rejection

    execute_sql --> present_results[Present Results]
    present_results --> log_audit[Log Audit]
    handle_rejection --> log_audit
    log_audit --> END([End])

    style START fill:#22c55e,stroke:#16a34a,color:#fff
    style END fill:#ef4444,stroke:#dc2626,color:#fff
    style hitl_gate fill:#f59e0b,stroke:#d97706,color:#fff
    style hitl_decision fill:#f59e0b,stroke:#d97706,color:#000
    style handle_rejection fill:#ef4444,stroke:#dc2626,color:#fff
    style execute_sql fill:#3b82f6,stroke:#2563eb,color:#fff
    style generate_sql fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style classify_query fill:#ec4899,stroke:#db2777,color:#fff
    style check_guardrails fill:#06b6d4,stroke:#0891b2,color:#fff
    style present_results fill:#10b981,stroke:#059669,color:#fff
`

// Sequence diagram for agent interactions
const AGENT_SEQUENCE_DIAGRAM = `
sequenceDiagram
    participant U as User
    participant O as Orchestrator
    participant M as MCP Server
    participant S as SQL Agent
    participant C as Classifier Agent
    participant H as HITL Agent
    participant E as Executor Agent
    participant P as Presenter Agent

    U->>O: Natural Language Query
    O->>M: Request Schema
    M-->>O: Schema JSON
    O->>S: Generate SQL
    S-->>O: SQL Statement + Confidence
    O->>C: Classify Query
    C-->>O: Query Type + Risk Score
    O->>C: Check Guardrails
    C-->>O: Violations (if any)

    alt WRITE Query
        O->>H: Request Approval
        H-->>U: Pending Approval
        U->>H: Decision (Approve/Reject)
        H-->>O: Decision Result
    end

    alt Approved or READ
        O->>E: Execute SQL
        E-->>O: Query Results
        O->>P: Format Results
        P-->>O: Natural Language Summary
    end

    O-->>U: Final Response
`

// Decision tree diagram
const DECISION_TREE_DIAGRAM = `
flowchart TD
    A[Incoming Query] --> B{Guardrail Check}
    B -->|Pass| C{Query Type?}
    B -->|Fail| D[BLOCKED]

    C -->|READ| E[Auto Execute]
    C -->|WRITE| F{HITL Review}
    C -->|UNSAFE| D

    F -->|Approved| G[Execute with Audit]
    F -->|Rejected| H[REJECTED]

    E --> I[Present Results]
    G --> I

    D --> J[Log & Notify]
    H --> J
    I --> K[Log Audit Trail]
    J --> K

    style D fill:#ef4444,stroke:#dc2626,color:#fff
    style H fill:#f97316,stroke:#ea580c,color:#fff
    style E fill:#22c55e,stroke:#16a34a,color:#fff
    style G fill:#22c55e,stroke:#16a34a,color:#fff
    style F fill:#f59e0b,stroke:#d97706,color:#fff
`

interface WorkflowDiagramProps {
  className?: string
}

type DiagramType = 'workflow' | 'sequence' | 'decision'

export default function WorkflowDiagram({ className }: WorkflowDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [diagramType, setDiagramType] = useState<DiagramType>('workflow')
  const [customDiagram, setCustomDiagram] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const diagrams: Record<DiagramType, { label: string; diagram: string }> = {
    workflow: { label: 'LangGraph Workflow', diagram: DEFAULT_WORKFLOW_DIAGRAM },
    sequence: { label: 'Agent Sequence', diagram: AGENT_SEQUENCE_DIAGRAM },
    decision: { label: 'Decision Tree', diagram: DECISION_TREE_DIAGRAM },
  }

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#1f2937',
        primaryBorderColor: '#2563eb',
        lineColor: '#6b7280',
        secondaryColor: '#f3f4f6',
        tertiaryColor: '#e5e7eb',
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      sequence: {
        useMaxWidth: true,
        showSequenceNumbers: true,
      },
    })
  }, [])

  useEffect(() => {
    renderDiagram()
  }, [diagramType, customDiagram])

  const renderDiagram = async () => {
    if (!containerRef.current) return

    try {
      const diagram = customDiagram || diagrams[diagramType].diagram
      const { svg } = await mermaid.render(`mermaid-${Date.now()}`, diagram)
      containerRef.current.innerHTML = svg

      // Make SVG responsive with different sizes per diagram type
      const svgElement = containerRef.current.querySelector('svg')
      if (svgElement) {
        // Different sizes for each diagram type
        const sizeMap: Record<DiagramType, string> = {
          workflow: '25%',    // LangGraph Workflow - smallest
          sequence: '75%',    // Agent Sequence - doubled
          decision: '31.25%', // Decision Tree - 25% larger than workflow
        }
        svgElement.style.maxWidth = sizeMap[diagramType] || '25%'
        svgElement.style.height = 'auto'
      }
    } catch (err) {
      console.error('Mermaid render error:', err)
      setError('Failed to render diagram')
    }
  }

  const fetchWorkflowFromServer = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`${API_URL}/agents/workflow/`)
      if (response.data?.mermaid) {
        setCustomDiagram(response.data.mermaid)
      }
    } catch (err) {
      console.error('Failed to fetch workflow:', err)
      // Fall back to default diagram
      setCustomDiagram(null)
    } finally {
      setLoading(false)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div
      className={clsx(
        'bg-white rounded-lg shadow-sm border border-gray-200',
        isFullscreen && 'fixed inset-4 z-50 overflow-auto',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Workflow Visualization</h3>

          {/* Diagram type tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            {(Object.keys(diagrams) as DiagramType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setDiagramType(type)
                  setCustomDiagram(null)
                }}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  diagramType === type && !customDiagram
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {diagrams[type].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchWorkflowFromServer}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Fetch live workflow from server"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4" />
                Exit
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                Fullscreen
              </>
            )}
          </button>
        </div>
      </div>

      {/* Diagram */}
      <div className={clsx('p-6', isFullscreen ? 'h-[calc(100%-80px)] overflow-auto' : '')}>
        {error ? (
          <div className="flex items-center justify-center h-64 text-red-500">
            {error}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="flex items-center justify-center min-h-[300px]"
          />
        )}
      </div>

      {/* Legend */}
      <div className="px-6 pb-4">
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>Start/Auto-Execute</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span>Execution</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-500" />
            <span>SQL Generation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500" />
            <span>HITL Required</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span>Blocked/Rejected</span>
          </div>
        </div>
      </div>
    </div>
  )
}
