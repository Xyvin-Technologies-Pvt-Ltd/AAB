import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Generate initials from name (max 2 letters)
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  // Get first letter of first and last name
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Color palette for avatars - different colors for different initials
const avatarColors = [
  'bg-indigo-600',
  'bg-blue-600',
  'bg-purple-600',
  'bg-pink-600',
  'bg-red-600',
  'bg-orange-600',
  'bg-amber-600',
  'bg-yellow-600',
  'bg-lime-600',
  'bg-green-600',
  'bg-emerald-600',
  'bg-teal-600',
  'bg-cyan-600',
  'bg-sky-600',
  'bg-violet-600',
  'bg-fuchsia-600',
];

// Get color for initials - ensures same initials get same color
const initialsColorMap = new Map();

export function getAvatarColor(initials) {
  if (!initials || initials === '?') {
    return avatarColors[0];
  }
  
  // If we already have a color for these initials, return it
  if (initialsColorMap.has(initials)) {
    return initialsColorMap.get(initials);
  }
  
  // Assign a color based on the initials hash
  // Use a simple hash function to consistently map initials to colors
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % avatarColors.length;
  const color = avatarColors[colorIndex];
  
  // Store the mapping
  initialsColorMap.set(initials, color);
  
  return color;
}
