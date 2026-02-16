import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { MessageSquare, LayoutDashboard, Shield, Activity, Bot, Eye, Database, Menu, X, User, LogOut, ChevronDown } from 'lucide-react'
import { useStore } from '../../store'
import { useAuthStore } from '../../store/authStore'
import { clsx } from 'clsx'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isConnected, pendingApprovals } = useStore()
  const { user, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navItems = [
    { path: '/', label: 'Chat', icon: MessageSquare },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/hitl', label: 'Approvals', icon: Shield, badge: pendingApprovals.length },
    { path: '/agents', label: 'Agents', icon: Bot },
    { path: '/observability', label: 'Observability', icon: Eye },
    { path: '/fhir', label: 'FHIR Data', icon: Database },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username || 'User'

  const initials = user?.first_name
    ? user.first_name[0].toUpperCase()
    : user?.username?.[0]?.toUpperCase() || 'U'

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
                  'hidden lg:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
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

              {/* Desktop User Menu */}
              <div className="hidden md:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-700">{initials}</span>
                  </div>
                  <span className="hidden lg:inline text-sm font-medium text-gray-700 max-w-[120px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      <span className={clsx(
                        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1',
                        user?.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      )}>
                        {user?.role === 'admin' ? 'Admin' : 'Basic User'}
                      </span>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User className="h-4 w-4" />
                      My Profile
                    </Link>
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout() }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile connection dot */}
              <span
                className={clsx(
                  'md:hidden w-2.5 h-2.5 rounded-full shrink-0',
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

              {/* Mobile user section */}
              <div className="pt-2 mt-2 border-t border-gray-100">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary-700">{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <span className={clsx(
                    'ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0',
                    user?.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  )}>
                    {user?.role === 'admin' ? 'Admin' : 'Basic'}
                  </span>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center px-3 py-2.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  <User className="h-5 w-5 mr-3" />
                  My Profile
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout() }}
                  className="flex items-center w-full px-3 py-2.5 rounded-md text-sm font-medium text-danger-600 hover:bg-danger-50"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </button>
              </div>

              {/* Connection status */}
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
