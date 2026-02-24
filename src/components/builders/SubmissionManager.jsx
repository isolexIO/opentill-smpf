import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { createPageUrl } from '@/utils';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  published: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-slate-100 text-slate-800',
};

const CATEGORY_COLORS = {
  payment: 'bg-purple-100 text-purple-800',
  inventory: 'bg-blue-100 text-blue-800',
  reporting: 'bg-green-100 text-green-800',
  integration: 'bg-orange-100 text-orange-800',
  productivity: 'bg-pink-100 text-pink-800',
  security: 'bg-red-100 text-red-800',
  customization: 'bg-indigo-100 text-indigo-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function SubmissionManager({ submissions, builder, onRefresh }) {
  const [selectedId, setSelectedId] = useState(null);

  if (submissions.length === 0) {
    return (
      <CardContent className="p-12 text-center">
        <div className="space-y-4">
          <p className="text-gray-600 text-lg">No Chips submitted yet</p>
          <p className="text-gray-500 text-sm">
            Submit your first Chip to get started earning revenue
          </p>
          <Button
            onClick={() => (window.location.href = createPageUrl('SubmitChip'))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Submit Your First Chip
          </Button>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent className="p-6">
      <div className="space-y-4">
        {submissions.map((chip) => (
          <Card key={chip.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    {chip.logo_url && (
                      <img src={chip.logo_url} alt={chip.name} className="w-12 h-12 rounded-lg" />
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{chip.name}</h3>
                      <p className="text-sm text-gray-600">{chip.short_description}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={STATUS_COLORS[chip.status]}>
                      {chip.status.charAt(0).toUpperCase() + chip.status.slice(1)}
                    </Badge>
                    <Badge className={CATEGORY_COLORS[chip.category]}>
                      {chip.category}
                    </Badge>
                    {chip.featured && (
                      <Badge className="bg-amber-100 text-amber-800">Featured</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-y border-gray-200">
                    <div>
                      <p className="text-xs text-gray-600">Sales</p>
                      <p className="font-bold text-gray-900">{chip.total_sales || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Installs</p>
                      <p className="font-bold text-gray-900">{chip.total_installs || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Revenue</p>
                      <p className="font-bold text-gray-900">
                        ${(chip.total_revenue || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Rating</p>
                      <p className="font-bold text-gray-900">
                        {chip.rating?.toFixed(1) || 'N/A'} ⭐
                      </p>
                    </div>
                  </div>

                  {chip.review_notes && chip.status === 'rejected' && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs text-red-700 font-medium">Rejection Reason:</p>
                      <p className="text-sm text-red-600">{chip.review_notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  {chip.status === 'published' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(createPageUrl(`Marketplace?chip=${chip.id}`), '_blank')
                      }
                      title="View on marketplace"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  {['draft', 'rejected'].includes(chip.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => (window.location.href = createPageUrl(`EditChip?id=${chip.id}`))}
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                  {chip.status !== 'published' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (
                          confirm('Are you sure? This action cannot be undone.')
                        ) {
                          // Delete chip
                        }
                      }}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </CardContent>
  );
}