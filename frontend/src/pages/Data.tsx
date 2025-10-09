import React, { useState, useEffect } from 'react'
import { Download, Database, FileSpreadsheet, TrendingUp, Users, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useColorScheme } from '../contexts/ColorSchemeContext'
import { dataExportApi } from '../services/api'

interface DataExport {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  category: 'projections' | 'performance' | 'analytics'
  estimatedSize: string
  lastUpdated: string
  available: boolean
}

const Data = () => {
  const { colorScheme } = useColorScheme()
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number>(0)
  const [dataExports, setDataExports] = useState<DataExport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load available exports on component mount
  useEffect(() => {
    const loadExports = async () => {
      try {
        setLoading(true)
        const response = await dataExportApi.getAvailableExports()
        
        if (response.success) {
          // Map API response to our DataExport interface
          const exports = response.data.map((exportItem: any) => ({
            id: exportItem.id,
            name: exportItem.name,
            description: exportItem.description,
            icon: getIconForCategory(exportItem.category),
            category: exportItem.category,
            estimatedSize: exportItem.estimatedSize,
            lastUpdated: new Date().toISOString().split('T')[0], // Use current date as fallback
            available: exportItem.available
          }))
          
          setDataExports(exports)
        } else {
          setError('Failed to load available exports')
        }
      } catch (err) {
        setError('Failed to load available exports')
      } finally {
        setLoading(false)
      }
    }

    loadExports()
  }, [])

  // Helper function to get icon based on category
  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'projections': return TrendingUp
      case 'performance': return Users
      case 'analytics': return Calendar
      default: return Database
    }
  }

  const handleDownload = async (exportId: string) => {
    setDownloading(exportId)
    setDownloadProgress(0)

    try {
      // Simulate download progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Get current year for the download
      const currentYear = new Date().getFullYear()
      
      // Make API call to download CSV
      const response = await dataExportApi.downloadExport(exportId, currentYear)

      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition']
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `${exportId}-${currentYear}-${new Date().toISOString().split('T')[0]}.csv`
      
      // Create download link
      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      clearInterval(progressInterval)
      setDownloadProgress(100)
      
      // Reset after a short delay
      setTimeout(() => {
        setDownloading(null)
        setDownloadProgress(0)
      }, 1000)

    } catch (error) {
      setDownloading(null)
      setDownloadProgress(0)
      setError('Download failed. Please try again.')
      // You could add a toast notification here
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'projections': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'performance': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'analytics': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'projections': return 'Projections'
      case 'performance': return 'Performance'
      case 'analytics': return 'Analytics'
      default: return 'Other'
    }
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/20">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Data Exports</h1>
              <p className="text-muted-foreground mt-1">
                Download comprehensive datasets for analysis and research
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <FileSpreadsheet className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Exports</p>
                <p className="text-2xl font-bold text-foreground">{dataExports.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Download className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-foreground">
                  {dataExports.filter(exp => exp.available).length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <TrendingUp className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-2xl font-bold text-foreground">Today</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Data Export Cards */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Available Downloads</h2>
          
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-muted-foreground">Loading available exports...</span>
              </div>
            </div>
          )}

          {error && (
            <Card className="p-6 border-red-500/30 bg-red-500/10">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div>
                  <h3 className="font-medium text-red-400">Error Loading Exports</h3>
                  <p className="text-sm text-red-300 mt-1">{error}</p>
                </div>
              </div>
            </Card>
          )}

          {!loading && !error && dataExports.length === 0 && (
            <Card className="p-6">
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Exports Available</h3>
                <p className="text-muted-foreground">No data exports are currently available.</p>
              </div>
            </Card>
          )}
          
          {!loading && !error && dataExports.map((exportItem) => (
            <Card key={exportItem.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-3 rounded-lg bg-primary/20">
                    <exportItem.icon className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {exportItem.name}
                      </h3>
                      <Badge className={getCategoryColor(exportItem.category)}>
                        {getCategoryLabel(exportItem.category)}
                      </Badge>
                      {!exportItem.available && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Coming Soon
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground mb-4">
                      {exportItem.description}
                    </p>
                    
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Database className="h-4 w-4" />
                        <span>{exportItem.estimatedSize}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Updated {exportItem.lastUpdated}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="ml-6">
                  <Button
                    onClick={() => handleDownload(exportItem.id)}
                    disabled={!exportItem.available || downloading === exportItem.id}
                    className="min-w-[120px]"
                  >
                    {downloading === exportItem.id ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{downloadProgress}%</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <Card className="p-6 mt-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">About Data Exports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2">Data Format</h4>
              <p>All exports are provided in CSV format for easy analysis in Excel, Google Sheets, or data analysis tools.</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Update Frequency</h4>
              <p>Data is updated daily during the season and weekly during the offseason. Check the "Last Updated" date for each export.</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Usage Rights</h4>
              <p>Data is provided for personal analysis and research. Commercial use may require additional licensing.</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Support</h4>
              <p>For questions about the data or to request additional exports, please contact our support team.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Data
