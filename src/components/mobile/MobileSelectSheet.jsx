import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ChevronDown } from 'lucide-react';

export default function MobileSelectSheet({ trigger, items, value, onValueChange }) {
  const [open, setOpen] = useState(false);

  const selectedItem = items.find((item) => item.value === value);

  const handleSelect = (itemValue) => {
    onValueChange(itemValue);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setOpen(true)}
      >
        <span className="truncate">
          {selectedItem?.label || trigger || 'Select...'}
        </span>
        <ChevronDown className="w-4 h-4 opacity-50" />
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="border-b">
            <DrawerTitle>{trigger}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-2">
            {items.map((item) => (
              <button
                key={item.value}
                onClick={() => handleSelect(item.value)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  value === item.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="p-4 border-t">
            <DrawerClose asChild>
              <Button className="w-full" variant="outline">
                Close
              </Button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}