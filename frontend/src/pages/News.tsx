import React from 'react'
import NewsFeed from '../components/dashboard/NewsFeed'

const News: React.FC = () => {
  // TODO: Load user roster and followed entities from config/user data
  const userRoster: string[] = []
  const followedEntities: string[] = []

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">News</h1>
          <p className="text-muted-foreground">Stay updated with the latest fantasy football news and updates</p>
        </div>

        {/* News Feed */}
        <NewsFeed 
          userRoster={userRoster}
          followedEntities={followedEntities}
        />
      </div>
    </div>
  )
}

export default News

