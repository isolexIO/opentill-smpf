import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, HelpCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { userManualSections as sections } from './userManualSections';

export default function UserManual() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('getting-started');

  const filteredSections = sections.map(section => ({
    ...section,
    content: section.content.filter(item =>
      searchTerm === '' ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.content.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">openTILL POS User Manual</h1>
        <p className="text-blue-100">Complete guide to using your point of sale system</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search user manual..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 py-6 text-lg"
        />
      </div>

      {/* Manual Content */}
      <Tabs value={activeSection} onValueChange={setActiveSection} className="flex flex-col md:flex-row gap-6">
        {/* Vertical Tab List */}
        <div className="md:w-64 flex-shrink-0">
          <ScrollArea className="h-auto md:h-[calc(100vh-300px)]">
            <TabsList className="flex flex-col h-auto space-y-1 bg-transparent">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    className="w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20"
                  >
                    <Icon className={`w-5 h-5 ${section.color}`} />
                    <span className="text-left">{section.title}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollArea>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            return (
              <TabsContent key={section.id} value={section.id} className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-${section.color.replace('text-', '')}-400 to-${section.color.replace('text-', '')}-600 flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {section.content.length === 0 && searchTerm !== '' ? (
                      <p className="text-gray-500 text-center py-8">
                        No results found for "{searchTerm}"
                      </p>
                    ) : (
                      section.content.map((item, index) => (
                        <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                            <Badge variant="outline">{index + 1}</Badge>
                            {item.title}
                          </h3>
                          <div className="space-y-4">
                            <div className="text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                              {item.content}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </div>
      </Tabs>

      {/* Help Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <HelpCircle className="w-6 h-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Still need help?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Our support team is here to help you succeed. Submit a ticket or reach us by phone/email!
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">📞 419-729-3889</Badge>
                <Badge variant="outline">✉️ support@isolex.io</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}