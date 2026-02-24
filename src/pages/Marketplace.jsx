import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Sparkles, TrendingUp, Clock, CheckCircle, Lock } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function Marketplace() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: chips = [], isLoading } = useQuery({
    queryKey: ['marketplace-chips'],
    queryFn: () => base44.entities.Chip.filter({ 
      status: 'PUBLISHED',
      is_active: true 
    })
  });

  const filteredChips = chips.filter(chip => {
    const matchesSearch = chip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chip.short_description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || chip.category === selectedCategory;
    
    const now = new Date();
    const inSchedule = (!chip.start_time || new Date(chip.start_time) <= now) &&
                      (!chip.end_time || new Date(chip.end_time) >= now);
    
    return matchesSearch && matchesCategory && inSchedule;
  });

  const featuredChips = filteredChips.filter(c => c.featured).slice(0, 6);
  const popularChips = filteredChips.sort((a, b) => (b.mints_count || 0) - (a.mints_count || 0));

  const categories = [
    { value: 'all', label: 'All Chips' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'payments', label: 'Payments' },
    { value: 'integrations', label: 'Integrations' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'operations', label: 'Operations' },
    { value: 'security', label: 'Security' }
  ];

  const getChipStatus = (chip) => {
    if (chip.total_supply && chip.mints_count >= chip.total_supply) return 'SOLD_OUT';
    if (chip.start_time && new Date(chip.start_time) > new Date()) return 'COMING_SOON';
    return 'LIVE';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header Navigation */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = createPageUrl('Home')}>
              <Sparkles className="w-8 h-8 text-cyan-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">openTILL Marketplace</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => window.location.href = createPageUrl('Home')}>
                Home
              </Button>
              <Button onClick={() => window.location.href = createPageUrl('EmailLogin')}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-12 px-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 rounded-full text-sm font-bold">
            <Sparkles className="w-4 h-4" />
            CHIP MARKETPLACE
          </div>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Unlock Premium Features
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Purchase Chips with $DUC to unlock advanced POS capabilities
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search chips..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
            {categories.map(cat => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.value)}
                className="whitespace-nowrap"
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="featured" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="featured">Featured</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="all">All Chips</TabsTrigger>
          </TabsList>

          <TabsContent value="featured" className="space-y-4">
            <ChipGrid chips={featuredChips} getChipStatus={getChipStatus} />
          </TabsContent>

          <TabsContent value="popular" className="space-y-4">
            <ChipGrid chips={popularChips} getChipStatus={getChipStatus} />
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <ChipGrid chips={filteredChips} getChipStatus={getChipStatus} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ChipGrid({ chips, getChipStatus }) {
  if (chips.length === 0) {
    return (
      <div className="text-center py-12">
        <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-500">No chips found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {chips.map(chip => (
        <ChipMarketCard key={chip.id} chip={chip} status={getChipStatus(chip)} />
      ))}
    </div>
  );
}

function ChipMarketCard({ chip, status }) {
  const statusConfig = {
    LIVE: { color: 'bg-green-500', text: 'Live', icon: CheckCircle },
    COMING_SOON: { color: 'bg-yellow-500', text: 'Coming Soon', icon: Clock },
    SOLD_OUT: { color: 'bg-red-500', text: 'Sold Out', icon: Lock }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-cyan-400">
      <CardHeader>
        <div className="relative mb-4">
          <img 
            src={chip.image_url || '/api/placeholder/80/80'} 
            alt={chip.name}
            className="w-full aspect-square rounded-lg object-cover"
          />
          <Badge className={`absolute top-2 left-2 ${config.color} text-white shadow-lg z-10`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.text}
          </Badge>
        </div>
        <CardTitle className="text-xl">{chip.name}</CardTitle>
        <CardDescription>{chip.short_description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Type</span>
            <Badge variant="outline">{chip.billing_type}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Price</span>
            <span className="font-bold text-cyan-600">
              {chip.billing_type === 'ONE_TIME' 
                ? `${chip.price_duc} $DUC` 
                : `${chip.recurring_price_duc} $DUC/${chip.interval?.toLowerCase()}`}
            </span>
          </div>
          {chip.total_supply && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Supply</span>
              <span className="text-sm">{chip.mints_count || 0}/{chip.total_supply}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full bg-cyan-600 hover:bg-cyan-700"
          onClick={() => window.location.href = createPageUrl(`ChipDetail?id=${chip.id}`)}
          disabled={status === 'SOLD_OUT'}
        >
          {status === 'SOLD_OUT' ? 'Sold Out' : 'View Details'}
        </Button>
      </CardFooter>
    </Card>
  );
}