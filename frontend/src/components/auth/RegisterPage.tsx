import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../utils/api'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    phone: '',
    department: '',
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    try {
      const res = await authApi.register(form)
      setAuth(res.data.user, res.data.tokens)
      navigate('/')
    } catch (err: any) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        setErrors(data)
      } else {
        setErrors({ non_field_errors: ['Registration failed. Please try again.'] })
      }
    } finally {
      setLoading(false)
    }
  }

  const getError = (field: string) => {
    const fieldErrors = errors[field]
    return fieldErrors ? fieldErrors[0] : ''
  }

  const updateField = (field: string, value: string) => {
    setForm({ ...form, [field]: value })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2">
          <Activity className="h-8 w-8 sm:h-10 sm:w-10 text-primary-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Healthcare Intelligence</h1>
        </div>
        <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-bold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-6 sm:py-8 px-4 sm:px-10 shadow-sm rounded-lg border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.non_field_errors && (
              <div className="bg-danger-50 border border-danger-200 text-danger-700 rounded-lg p-3 text-sm">
                {errors.non_field_errors[0]}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  id="first_name"
                  type="text"
                  value={form.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
                  placeholder="First name"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  id="last_name"
                  type="text"
                  value={form.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username <span className="text-danger-500">*</span>
              </label>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
                placeholder="Choose a username"
              />
              {getError('username') && (
                <p className="mt-1 text-sm text-danger-600">{getError('username')}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email <span className="text-danger-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
                placeholder="you@example.com"
              />
              {getError('email') && (
                <p className="mt-1 text-sm text-danger-600">{getError('email')}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                  Department
                </label>
                <input
                  id="department"
                  type="text"
                  value={form.department}
                  onChange={(e) => updateField('department', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
                  placeholder="Department"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password <span className="text-danger-500">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {getError('password') && (
                <p className="mt-1 text-sm text-danger-600">{getError('password')}</p>
              )}
            </div>

            <div>
              <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700">
                Confirm Password <span className="text-danger-500">*</span>
              </label>
              <input
                id="password_confirm"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={form.password_confirm}
                onChange={(e) => updateField('password_confirm', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm sm:text-base"
                placeholder="Confirm your password"
              />
              {getError('password_confirm') && (
                <p className="mt-1 text-sm text-danger-600">{getError('password_confirm')}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
