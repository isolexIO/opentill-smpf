import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Search, User, Check } from 'lucide-react';

export default function MobileCustomerSheet({ isOpen, onClose, customers, selectedCustomer, onSelect }) {
  const [search, setSearch] = useState('');

  const filtered = (customers || []).filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[70vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Select Customer</SheetTitle>
        </SheetHeader>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="pl-9"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          <button
            className="w-full text-left p-3 rounded-lg hover:bg-gray-50 flex items-center gap-3"
            onClick={() => {
              onSelect(null);
              onClose();
            }}
          >
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-500" />
            </div>
            <span className="font-medium">Walk-in Customer</span>
            {!selectedCustomer && <Check className="w-5 h-5 text-green-600 ml-auto" />}
          </button>
          {filtered.map((c) => (
            <button
              key={c.id}
              className="w-full text-left p-3 rounded-lg hover:bg-gray-50 flex items-center gap-3"
              onClick={() => {
                onSelect(c);
                onClose();
              }}
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{c.name}</p>
                {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
              </div>
              {selectedCustomer?.id === c.id && <Check className="w-5 h-5 text-green-600" />}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}