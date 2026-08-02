import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Rocket, ArrowRight } from 'lucide-react';

const ICO_URL = 'https://ico.opentill.io/';
const DUC_LOGO =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6970e2871534100b4ebb8d45/8e45f76fe_DUC3.png';

export default function ICOLink({ className = '' }) {
  return (
    <Card className={`bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-800 border-0 shadow-lg ${className}`}>
      <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4">
        <img src={DUC_LOGO} alt="$DUC token" className="w-12 h-12 shrink-0 drop-shadow-lg rounded-full bg-white/10 p-1" />
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-white font-bold flex items-center justify-center sm:justify-start gap-2">
            <Rocket className="w-4 h-4" /> $DUC Presale is Live
          </h3>
          <p className="text-white/80 text-sm mt-1">
            Join the presale at early-bird pricing. $DUC powers rewards, chips, and staking across openTILL.
          </p>
          <a
            href={ICO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/80 text-xs underline hover:text-white mt-1 inline-block"
          >
            ico.opentill.io
          </a>
        </div>
        <Button
          size="lg"
          className="bg-white text-purple-700 hover:bg-gray-100 shrink-0 font-semibold"
          onClick={() => window.open(ICO_URL, '_blank')}
        >
          Join Presale <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}