import { useEffect, useState } from 'react'
import { Save, RefreshCw } from 'lucide-react'

type LeagueSettings = {
  teams: number
  roster_spots: {
    qb: number
    rb: number
    wr: number
    te: number
    k: number
    def: number
    bench: number
  }
  scoring_type: 'standard' | 'ppr' | 'half-ppr'
}

const Settings = () => {
  const [settings, setSettings] = useState<LeagueSettings>({
    teams: 12,
    roster_spots: {
      qb: 1,
      rb: 2,
      wr: 2,
      te: 1,
      k: 1,
      def: 1,
      bench: 6,
    },
    scoring_type: 'ppr',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    try {
      setIsLoading(true)
      const saved = localStorage.getItem('ffa_settings')
      if (saved) {
        setSettings(JSON.parse(saved))
      }
    } catch (error) {
      setMessage('Failed to load saved settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      localStorage.setItem('ffa_settings', JSON.stringify(settings))
      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setSettings({
      teams: 12,
      roster_spots: {
        qb: 1,
        rb: 2,
        wr: 2,
        te: 1,
        k: 1,
        def: 1,
        bench: 6,
      },
      scoring_type: 'ppr',
    })
    setMessage('Settings reset to defaults')
    setTimeout(() => setMessage(''), 3000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Analysis Settings</h1>
        <p className="mt-2 text-gray-600">
          Configure your fantasy football analysis preferences
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('successfully') 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Basic Settings</h2>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Teams
            </label>
            <select
              value={settings.teams}
              onChange={(e) => setSettings({ ...settings, teams: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {[8, 10, 12, 14, 16].map((num) => (
                <option key={num} value={num}>{num} Teams</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scoring System
            </label>
            <select
              value={settings.scoring_type}
              onChange={(e) => setSettings({ ...settings, scoring_type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="standard">Standard</option>
              <option value="ppr">Point Per Reception (PPR)</option>
              <option value="half-ppr">Half Point Per Reception (0.5 PPR)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Roster Configuration</h2>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(settings.roster_spots).map(([position, count]) => (
            <div key={position}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {position.toUpperCase()} Spots
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={count}
                onChange={(e) => setSettings({
                  ...settings,
                  roster_spots: {
                    ...settings.roster_spots,
                    [position]: parseInt(e.target.value) || 0
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            Total Roster Spots: {Object.values(settings.roster_spots).reduce((sum, count) => sum + count, 0)}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={handleReset}
          className="btn-secondary"
          disabled={isSaving}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          className="btn-primary"
          disabled={isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

export default Settings
