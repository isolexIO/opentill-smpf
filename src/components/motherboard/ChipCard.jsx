import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, CheckCircle2, AlertCircle, Cpu, Zap, Shield, Database, BarChart, Globe, Users, Settings } from 'lucide-react';

const iconMap = {
  Cpu, Zap, Shield, Database, BarChart, Globe, Users, Settings
};

export default function ChipCard({ chip, isUnlocked, nftCount }) {
  const Icon = iconMap[chip.icon] || Cpu;
  
  const categoryColors = {
    core: 'bg-blue-500',
    premium: 'bg-purple-500',
    enterprise: 'bg-amber-500'
  };

  const categoryBadgeColors = {
    core: 'bg-blue-100 text-blue-800',
    premium: 'bg-purple-100 text-purple-800',
    enterprise: 'bg-amber-100 text-amber-800'
  };

  return (
    <Card 
      className={`relative overflow-hidden transition-all hover:shadow-lg ${
        isUnlocked ? 'border-green-500 border-2' : 'opacity-60'
      }`}
    >
      <div 
        className={`absolute top-0 left-0 right-0 h-2 ${categoryColors[chip.category]}`}
        style={{ backgroundColor: chip.color || categoryColors[chip.category] }}
      />
      
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                isUnlocked ? 'bg-green-100' : 'bg-gray-100'
              }`}
            >
              <Icon className={`w-6 h-6 ${isUnlocked ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {chip.name}
                {isUnlocked ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Lock className="w-4 h-4 text-gray-400" />
                )}
              </CardTitle>
              <Badge className={`mt-1 ${categoryBadgeColors[chip.category]}`}>
                {chip.category}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <CardDescription className="mb-4">{chip.description}</CardDescription>
        
        <div className="flex items-center gap-2 text-sm">
          {isUnlocked ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">Unlocked ({nftCount}/{chip.required_nft_count} NFTs)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <AlertCircle className="w-4 h-4" />
              <span>Requires {chip.required_nft_count} NFT{chip.required_nft_count > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}