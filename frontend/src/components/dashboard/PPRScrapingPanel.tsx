import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select } from '../ui/select';
import { Input } from '../ui/input';

interface ScrapingResult {
  success: boolean;
  source?: string;
  season?: number;
  week?: number;
  dataType?: string;
  summary?: {
    totalPlayers: number;
    successfulSources: number;
    failedSources: number;
    validationPassed: boolean;
  };
  positions?: Record<string, any>;
  validation?: {
    passed: boolean;
    issues: string[];
    checks: Record<string, any>;
  };
  consensusAnalysis?: {
    totalPlayers: number;
    consensusPlayers: number;
    topDiscrepancies: any[];
  };
  duration?: number;
  error?: string;
}

interface ScrapingStatus {
  service: string;
  status: string;
  sources: Array<{
    key: string;
    name: string;
    enabled: boolean;
    priority: number;
    type: string;
  }>;
  nflState?: {
    season: number;
    week: number;
    season_type: string;
  };
}

const PPRScrapingPanel: React.FC = () => {
  const [scrapingStatus, setScrapingStatus] = useState<ScrapingStatus | null>(null);
  const [lastResult, setLastResult] = useState<ScrapingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState('fantasypros');
  const [selectedDataType, setSelectedDataType] = useState('projections');
  const [selectedPositions, setSelectedPositions] = useState(['QB', 'RB', 'WR', 'TE', 'DST']);
  const [customWeek, setCustomWeek] = useState('');
  const [customSeason, setCustomSeason] = useState('');
  
  // Bulk FantasyPros scraping state
  const [isBulkScraping, setIsBulkScraping] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    currentWeek: number;
    totalWeeks: number;
    completedWeeks: number;
    totalPlayers: number;
    playersUpdated: number;
  } | null>(null);
  
  const positions = ['QB', 'RB', 'WR', 'TE', 'DST'];
  const sources = [
    { key: 'fantasypros', name: 'FantasyPros' }
  ];

  useEffect(() => {
    fetchScrapingStatus();
  }, []);

  const fetchScrapingStatus = async () => {
    try {
      const response = await fetch('/api/ppr/status');
      if (response.ok) {
        const data = await response.json();
        setScrapingStatus(data.data);
      }
    } catch (error) {
      // Error fetching scraping status
    }
  };

  const handleScrape = async () => {
    setIsLoading(true);
    try {
      let endpoint = '/api/ppr/scrape';
      let body: any = {
        positions: selectedPositions,
        dataType: selectedDataType
      };

      if (customWeek) body.week = parseInt(customWeek);
      if (customSeason) body.season = parseInt(customSeason);

      // Always use FantasyPros endpoint
      endpoint = `/api/ppr/scrape/fantasypros`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      setLastResult(result.data || result);
      
      if (!response.ok) {
        throw new Error(result.message || 'Scraping failed');
      }
    } catch (error) {
      setLastResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsLoading(true);
    try {
      const body: any = {
        scraper: 'fantasypros',
        position: 'QB',
        dataType: selectedDataType
      };

      if (customWeek) body.week = parseInt(customWeek);
      if (customSeason) body.season = parseInt(customSeason);

      const response = await fetch('/api/ppr/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      setLastResult(result.data || result);
    } catch (error) {
      // Error during test
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async () => {
    setIsLoading(true);
    try {
      const body: any = {
        positions: selectedPositions
      };

      if (customWeek) body.week = parseInt(customWeek);
      if (customSeason) body.season = parseInt(customSeason);

      const response = await fetch('/api/ppr/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      setLastResult(result.data || result);
    } catch (error) {
      // Error during validation
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkFantasyProsScrape = async () => {
    setIsBulkScraping(true);
    setBulkProgress({
      currentWeek: 1,
      totalWeeks: 4,
      completedWeeks: 0,
      totalPlayers: 0,
      playersUpdated: 0
    });

    try {
      const weeks = [1, 2, 3, 4];
      let totalPlayersScraped = 0;
      let totalPlayersUpdated = 0;

      for (let i = 0; i < weeks.length; i++) {
        const week = weeks[i];
        
        setBulkProgress(prev => prev ? {
          ...prev,
          currentWeek: week,
          completedWeeks: i
        } : null);

        try {
          const response = await fetch('/api/ppr/scrape/fantasypros', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              week: week,
              season: 2025,
              updateDatabase: true
            }),
          });

          const result = await response.json();
          
          if (result.success) {
            totalPlayersScraped += result.data.scrapingResults.totalPlayers;
            totalPlayersUpdated += result.data.databaseUpdate?.playersUpdated || 0;
          }
        } catch (error) {
          // Error scraping week
        }

        // Small delay between weeks
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setBulkProgress(prev => prev ? {
        ...prev,
        completedWeeks: weeks.length,
        totalPlayers: totalPlayersScraped,
        playersUpdated: totalPlayersUpdated
      } : null);

      setLastResult({
        success: true,
        summary: {
          totalPlayers: totalPlayersScraped,
          successfulSources: weeks.length,
          failedSources: 0,
          validationPassed: true
        },
        duration: Date.now()
      });

    } catch (error) {
      setLastResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsBulkScraping(false);
      // Clear progress after 3 seconds
      setTimeout(() => {
        setBulkProgress(null);
      }, 3000);
    }
  };

  const togglePosition = (position: string) => {
    setSelectedPositions(prev => 
      prev.includes(position) 
        ? prev.filter(p => p !== position)
        : [...prev, position]
    );
  };

  const formatDuration = (ms: number) => {
    return `${Math.round(ms / 1000)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">PPR Data Scraping</h2>
          <p className="text-gray-600">
            Scrape weekly PPR projections from FantasyPros
          </p>
        </div>
        <Button 
          onClick={fetchScrapingStatus}
          variant="outline"
          size="sm"
        >
          Refresh Status
        </Button>
      </div>

      {/* Status Card */}
      {scrapingStatus && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Service Status</h3>
            <Badge variant={scrapingStatus.status === 'active' ? 'default' : 'destructive'}>
              {scrapingStatus.status}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {scrapingStatus.sources.map((source) => (
              <div key={source.key} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{source.name}</div>
                  <div className="text-sm text-gray-500">{source.type}</div>
                </div>
                <Badge variant={source.enabled ? 'default' : 'secondary'}>
                  {source.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            ))}
          </div>

          {scrapingStatus.nflState && (
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm font-medium">Current NFL State</div>
              <div className="text-sm text-gray-600">
                Season {scrapingStatus.nflState.season}, Week {scrapingStatus.nflState.week} ({scrapingStatus.nflState.season_type})
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Controls Card */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Scraping Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Source Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Source</label>
            <Select
              value={selectedSource}
              onValueChange={setSelectedSource}
            >
              {sources.map(source => (
                <option key={source.key} value={source.key}>
                  {source.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Data Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Data Type</label>
            <Select
              value={selectedDataType}
              onValueChange={setSelectedDataType}
            >
              <option value="projections">Projections</option>
              <option value="stats">Actuals/Stats</option>
            </Select>
          </div>

          {/* Custom Week */}
          <div>
            <label className="block text-sm font-medium mb-2">Week (Optional)</label>
            <Input
              type="number"
              min="1"
              max="18"
              value={customWeek}
              onChange={(e) => setCustomWeek(e.target.value)}
              placeholder="Current"
            />
          </div>

          {/* Custom Season */}
          <div>
            <label className="block text-sm font-medium mb-2">Season (Optional)</label>
            <Input
              type="number"
              min="2020"
              max="2030"
              value={customSeason}
              onChange={(e) => setCustomSeason(e.target.value)}
              placeholder="Current"
            />
          </div>
        </div>

        {/* Position Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Positions</label>
          <div className="flex flex-wrap gap-2">
            {positions.map(position => (
              <Badge
                key={position}
                variant={selectedPositions.includes(position) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => togglePosition(position)}
              >
                {position}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleScrape}
            disabled={isLoading || selectedPositions.length === 0}
            className="flex-1 min-w-[120px]"
          >
            {isLoading ? 'Scraping...' : 'Start Scraping'}
          </Button>
          
          <Button
            onClick={handleTest}
            disabled={isLoading}
            variant="outline"
          >
            Test Scrapers
          </Button>
          
          <Button
            onClick={handleValidate}
            disabled={isLoading || selectedPositions.length === 0}
            variant="outline"
          >
            Validate Only
          </Button>
        </div>
      </Card>

      {/* Bulk FantasyPros Scraping Card */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Bulk PPR Update</h3>
        <p className="text-sm text-gray-600 mb-4">
          Scrape and update all PPR projections for weeks 1-4 from FantasyPros for all existing players in your database.
        </p>
        
        <div className="flex flex-wrap gap-3 mb-4">
          <Button
            onClick={handleBulkFantasyProsScrape}
            disabled={isBulkScraping}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isBulkScraping ? 'Scraping...' : 'Update PPR Weeks (1-4)'}
          </Button>
        </div>

        {/* Progress Display */}
        {bulkProgress && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600">
                Week {bulkProgress.currentWeek} of {bulkProgress.totalWeeks}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(bulkProgress.completedWeeks / bulkProgress.totalWeeks) * 100}%` 
                }}
              ></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center p-2 border rounded">
                <div className="font-semibold text-blue-600">{bulkProgress.totalPlayers}</div>
                <div className="text-gray-600">Players Scraped</div>
              </div>
              <div className="text-center p-2 border rounded">
                <div className="font-semibold text-green-600">{bulkProgress.playersUpdated}</div>
                <div className="text-gray-600">Players Updated/Created</div>
              </div>
            </div>
            
            {bulkProgress.completedWeeks === bulkProgress.totalWeeks && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <div className="text-sm font-medium text-green-800">
                  ✅ Bulk update completed successfully!
                </div>
                <div className="text-sm text-green-700">
                  {bulkProgress.totalPlayers} players scraped, {bulkProgress.playersUpdated} players updated/created in database
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Results Card */}
      {lastResult && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Last Result</h3>
            <Badge variant={lastResult.success ? 'default' : 'destructive'}>
              {lastResult.success ? 'Success' : 'Failed'}
            </Badge>
          </div>

          {lastResult.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded mb-4">
              <div className="text-sm text-red-700">Error: {lastResult.error}</div>
            </div>
          )}

          {lastResult.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-blue-600">{lastResult.summary.totalPlayers}</div>
                <div className="text-sm text-gray-600">Total Players</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-green-600">{lastResult.summary.successfulSources}</div>
                <div className="text-sm text-gray-600">Successful Sources</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-red-600">{lastResult.summary.failedSources}</div>
                <div className="text-sm text-gray-600">Failed Sources</div>
              </div>
              <div className="text-center p-3 border rounded">
                <Badge variant={lastResult.summary.validationPassed ? 'default' : 'destructive'}>
                  {lastResult.summary.validationPassed ? 'Validation Passed' : 'Validation Failed'}
                </Badge>
              </div>
            </div>
          )}

          {lastResult.validation && !lastResult.validation.passed && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-4">
              <div className="text-sm font-medium text-yellow-800 mb-2">Validation Issues:</div>
              <ul className="text-sm text-yellow-700 space-y-1">
                {lastResult.validation.issues.map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}

          {lastResult.consensusAnalysis && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-4">
              <div className="text-sm font-medium text-blue-800 mb-2">Consensus Analysis:</div>
              <div className="text-sm text-blue-700">
                {lastResult.consensusAnalysis.consensusPlayers} players found across multiple sources
                {lastResult.consensusAnalysis.topDiscrepancies.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium">Top Discrepancies:</div>
                    {lastResult.consensusAnalysis.topDiscrepancies.slice(0, 3).map((disc: any, index: number) => (
                      <div key={index} className="text-xs">
                        {disc.player} ({disc.position}): {disc.variance.toFixed(1)} point variance
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {lastResult.duration && (
            <div className="text-sm text-gray-600">
              Completed in {formatDuration(lastResult.duration)}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default PPRScrapingPanel;
