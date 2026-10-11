import React from 'react';
import { Crown, Swords, Shield, Zap, Flame, User, Sparkles } from 'lucide-react';

interface HunterAvatarProps {
  avatar?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  glow?: boolean;
}

export const AVATAR_PRESETS = [
  { id: 'monarch', label: 'Shadow Monarch', icon: Crown, color: 'from-purple-600 via-indigo-700 to-purple-950', border: 'border-purple-500/50' },
  { id: 'blade', label: 'Radiant Blade', icon: Swords, color: 'from-amber-500 via-amber-700 to-amber-950', border: 'border-amber-500/50' },
  { id: 'igris', label: 'Red Commander', icon: Shield, color: 'from-rose-600 via-red-800 to-red-950', border: 'border-rose-500/50' },
  { id: 'mage', label: 'Mana Sovereign', icon: Sparkles, color: 'from-cyan-500 via-blue-700 to-blue-950', border: 'border-cyan-500/50' },
  { id: 'beru', label: 'Shadow Beast', icon: Flame, color: 'from-violet-600 via-purple-900 to-black', border: 'border-violet-500/50' },
  { id: 'hunter', label: 'Vanguard Striker', icon: Zap, color: 'from-emerald-500 via-teal-700 to-teal-950', border: 'border-emerald-500/50' },
];

export const HunterAvatar: React.FC<HunterAvatarProps> = ({
  avatar = 'monarch',
  name,
  size = 'md',
  className = '',
  glow = false,
}) => {
  const sizeClasses = {
    xs: 'w-7 h-7 text-xs rounded-lg',
    sm: 'w-9 h-9 text-sm rounded-xl',
    md: 'w-11 h-11 text-base rounded-2xl',
    lg: 'w-16 h-16 text-xl rounded-2xl',
    xl: 'w-24 h-24 text-3xl rounded-3xl',
  };

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const preset = AVATAR_PRESETS.find((p) => p.id === avatar);

  // If avatar is an external URL image
  if (avatar && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:image/'))) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden border ${preset?.border || 'border-purple-500/40'} ${sizeClasses[size]} ${glow ? 'shadow-[0_0_15px_rgba(168,85,247,0.4)]' : ''} ${className}`}
      >
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  if (preset) {
    const Icon = preset.icon;
    return (
      <div
        className={`relative shrink-0 flex items-center justify-center bg-gradient-to-br ${preset.color} border ${preset.border} ${sizeClasses[size]} ${
          glow ? 'shadow-[0_0_20px_rgba(168,85,247,0.35)]' : ''
        } ${className}`}
      >
        <Icon className={`${iconSizes[size]} text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]`} />
      </div>
    );
  }

  // Fallback initial
  return (
    <div
      className={`relative shrink-0 flex items-center justify-center bg-purple-950 border border-purple-500/40 font-bold text-white font-cinzel ${sizeClasses[size]} ${className}`}
    >
      {name ? name.charAt(0).toUpperCase() : <User className={iconSizes[size]} />}
    </div>
  );
};
