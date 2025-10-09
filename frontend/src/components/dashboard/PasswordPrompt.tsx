import React, { useState } from 'react'
import { Lock, X, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'

interface PasswordPromptProps {
  isOpen: boolean
  onClose: () => void
  onVerify: (password: string) => Promise<boolean>
}

const PasswordPrompt: React.FC<PasswordPromptProps> = ({ isOpen, onClose, onVerify }) => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!password) {
      setError('Please enter a password')
      return
    }

    setVerifying(true)
    try {
      const verified = await onVerify(password)
      if (verified) {
        setPassword('')
        onClose()
      } else {
        setError('Incorrect password')
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-background/95 border border-border/30 rounded-lg shadow-xl max-w-md w-full mx-4 backdrop-blur-sm">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Admin Access Required
              </CardTitle>
              <CardDescription>Enter password to access configuration panel</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full"
                  autoFocus
                  disabled={verifying}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={verifying}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className="flex-1"
                  disabled={verifying || !password}
                >
                  {verifying ? 'Verifying...' : 'Access Panel'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PasswordPrompt

