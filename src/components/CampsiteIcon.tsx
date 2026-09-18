'use client';

import { Tent, Sun, Crown, Home, Trees, Waves, Compass, Mountain } from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  Sun,
  Tent,
  Crown,
  Home,
  Trees,
  Waves,
  Compass,
  Mountain,
};

export default function CampsiteIcon({ name, size = 26 }: { name: string; size?: number }) {
  const Icon = ICONS[name] || Tent;
  return <Icon size={size} />;
}
