import { useState } from 'react'
import { User, Save, Key, Loader2, Shield, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../utils/api'
import { clsx } from 'clsx'

export default function ProfilePage() {
  const { user, setUser, setAuth } = useAuthStore()

  const [profileForm, setProfileForm] = useState({
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.profile?.phone || '',
    department: user?.profile?.department || '',
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileErrors, setProfileErrors] = useState<Record<string, string[]>>({})

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirm: '',
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({})
  const [showPasswords, setShowPasswords] = useState(false)

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileErrors({})
    setProfileSuccess('')
    setProfileLoading(true)

    try {
      const res = await authApi.updateProfile(profileForm)
      setUser(res.data)
      setProfileSuccess('Profile updated successfully.')
      setTimeout(() => setProfileSuccess(''), 3000)
    } catch (err: any) {
      setProfileErrors(err.response?.data || { detail: ['Failed to update profile.'] })
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordErrors({})
    setPasswordSuccess('')
    setPasswordLoading(true)

    try {
      const res = await authApi.changePassword(passwordForm)
      // Update tokens after password change
      if (res.data.tokens && user) {
        setAuth(user, res.data.tokens)
      }
      setPasswordSuccess('Password changed successfully.')
      setPasswordForm({ current_password: '', new_password: '', new_password_confirm: '' })
      setTimeout(() => setPasswordSuccess(''), 3000)
    } catch (err: any) {
      setPasswordErrors(err.response?.data || { detail: ['Failed to change password.'] })
    } finally {
      setPasswordLoading(false)
    }
  }

  const getProfileError = (field: string) => {
    const e = profileErrors[field]
    return e ? e[0] : ''
  }

  const getPasswordError = (field: string) => {
    const e = passwordErrors[field]
    return e ? e[0] : ''
  }

  if (!user) return null

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 shrink-0" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your account settings</p>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <span className="text-xl sm:text-2xl font-bold text-primary-700">
              {user.first_name?.[0] || user.username[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.username}
            </h2>
            <p className="text-sm text-gray-600 truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Shield className="h-3.5 w-3.5 text-gray-500" />
              <span className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                user.role === 'admin'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              )}>
                {user.role === 'admin' ? 'Admin' : 'Basic User'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h3>

          {profileSuccess && (
            <div className="flex items-center gap-2 bg-success-50 border border-success-200 text-success-700 rounded-lg p-3 text-sm mb-4">
              <CheckCircle className="h-4 w-4 shrink-0" />
              {profileSuccess}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {getProfileError('email') && (
                <p className="mt-1 text-sm text-danger-600">{getProfileError('email')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <input
                type="text"
                value={profileForm.department}
                onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {profileLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Password Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="text-gray-400 hover:text-gray-600"
            >
              {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {passwordSuccess && (
            <div className="flex items-center gap-2 bg-success-50 border border-success-200 text-success-700 rounded-lg p-3 text-sm mb-4">
              <CheckCircle className="h-4 w-4 shrink-0" />
              {passwordSuccess}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {getPasswordError('current_password') && (
                <p className="mt-1 text-sm text-danger-600">{getPasswordError('current_password')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {getPasswordError('new_password') && (
                <p className="mt-1 text-sm text-danger-600">{getPasswordError('new_password')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={passwordForm.new_password_confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password_confirm: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {getPasswordError('new_password_confirm') && (
                <p className="mt-1 text-sm text-danger-600">{getPasswordError('new_password_confirm')}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
