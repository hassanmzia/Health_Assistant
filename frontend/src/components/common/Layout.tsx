import { Outlet, Link, useLocation } from 'react-router-dom'
import { MessageSquare, LayoutDashboard, Shield, Activity, Bot, Eye } from 'lucide-react'
import { useStore } from '../../store'
import { clsx } from 'clsx'

export default function Layout() {
  const location = useLocation()
  const { isConnected, pendingApprovals } = useStore()

  const navItems = [
    { path: '/', label: 'Chat', icon: MessageSquare },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/hitl', label: 'Approvals', icon: Shield, badge: pendingApprovals.length },
    { path: '/agents', label: 'Agents', icon: Bot },
    { path: '/observability', label: 'Observability', icon: Eye },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">
                Healthcare Intelligence
              </span>
            </div>

            <nav className="flex space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={clsx(
                      'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-2 bg-danger-500 text-white text-xs rounded-full px-2 py-0.5">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center">
              <span
                className={clsx(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  isConnected
                    ? 'bg-success-50 text-success-600'
                    : 'bg-danger-50 text-danger-600'
                )}
              >
                <span
                  className={clsx(
                    'w-2 h-2 rounded-full mr-1.5',
                    isConnected ? 'bg-success-500' : 'bg-danger-500'
                  )}
                />
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}
