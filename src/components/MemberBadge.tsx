interface MemberBadgeProps {
  abbreviation: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function MemberBadge({
  abbreviation,
  color,
  size = 'md',
  className = ''
}: MemberBadgeProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded flex items-center justify-center text-white font-bold ${className}`}
      style={{ backgroundColor: color }}
      title={abbreviation}
    >
      {abbreviation}
    </div>
  );
}
