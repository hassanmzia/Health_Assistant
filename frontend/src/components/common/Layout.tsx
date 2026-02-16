import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { MessageSquare, LayoutDashboard, Shield, Activity, Bot, Eye, Database, Menu, X } from 'lucide-react'
import { useStore } from '../../store'
import { clsx } from 'clsx'

export default function Layout() {
  const location = useLocation()
  const { isConnected, pendingApprovals } = useStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { path: '/', label: 'Chat', icon: MessageSquare },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/hitl', label: 'Approvals', icon: Shield, badge: pendingApprovals.length },
    { path: '/agents', label: 'Agents', icon: Bot },
    { path: '/observability', label: 'Observability', icon: Eye },
    { path: '/fhir', label: 'FHIR Data', icon: Database },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center min-w-0">
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 shrink-0" />
              <span className="ml-2 text-base sm:text-xl font-semibold text-gray-900 truncate">
                Healthcare Intelligence
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1 lg:space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={clsx(
                      'flex items-center px-2 lg:px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="h-4 w-4 mr-1 lg:mr-2" />
                    <span className="hidden lg:inline">{item.label}</span>
                    <span className="lg:hidden text-xs">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-1 lg:ml-2 bg-danger-500 text-white text-xs rounded-full px-1.5 py-0.5">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center gap-2">
              {/* Connection Status (desktop) */}
              <span
                className={clsx(
                  'hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
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

              {/* Mobile connection dot */}
              <span
                className={clsx(
                  'sm:hidden w-2.5 h-2.5 rounded-full shrink-0',
                  isConnected ? 'bg-success-500' : 'bg-danger-500'
                )}
              />

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="px-3 py-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx(
                      'flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto bg-danger-500 text-white text-xs rounded-full px-2 py-0.5">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
              <div className="pt-2 border-t border-gray-100">
                <span
                  className={clsx(
                    'flex items-center px-3 py-2 text-xs font-medium',
                    isConnected ? 'text-success-600' : 'text-danger-600'
                  )}
                >
                  <span
                    className={clsx(
                      'w-2 h-2 rounded-full mr-2',
                      isConnected ? 'bg-success-500' : 'bg-danger-500'
                    )}
                  />
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}
