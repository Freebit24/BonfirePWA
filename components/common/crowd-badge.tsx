import { cn } from '@/lib/utils';
import { Event, CrowdLevel } from '@/types';
import { getCrowdLevel } from '@/utils/helpers';
import { CROWD_LEVELS } from '@/utils/constants';

interface CrowdBadgeProps {
  event: Event;
  className?: string;
}

export function CrowdBadge({ event, className }: CrowdBadgeProps) {
  const level: CrowdLevel = getCrowdLevel(event);
  const levelConfig = CROWD_LEVELS[level];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        levelConfig.color,
        className
      )}
    >
      {levelConfig.label}
    </span>
  );
}