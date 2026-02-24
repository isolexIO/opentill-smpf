import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MobileSelectSheet from '@/components/mobile/MobileSelectSheet';

export default function SelectWrapper({ 
  value, 
  onValueChange, 
  children,
  trigger = 'Select...',
  className = ''
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Extract items from SelectItem children
  const items = [];
  const React_Children_forEach = (children_arg) => {
    if (!children_arg) return;
    
    if (Array.isArray(children_arg)) {
      children_arg.forEach(child => {
        if (child?.props?.value) {
          items.push({
            value: child.props.value,
            label: child.props.children || child.props.value
          });
        }
      });
    } else if (children_arg?.props?.value) {
      items.push({
        value: children_arg.props.value,
        label: children_arg.props.children || children_arg.props.value
      });
    }
  };

  React_Children_forEach(children);

  if (isMobile) {
    return (
      <MobileSelectSheet
        trigger={trigger}
        items={items}
        value={value}
        onValueChange={onValueChange}
      />
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );
}