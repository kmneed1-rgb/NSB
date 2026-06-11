
export type PeriodStatus = 'past' | 'current' | 'future';

export const getPeriodStatus = (timeRange: string): PeriodStatus => {
  if (!timeRange) return 'future';

  const [startStr, endStr] = timeRange.split(' - ').map(s => s.trim());
  const now = new Date();

  // Helper to parse "HH:MM AM/PM" to Date
  const parseTime = (timeStr: string) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const start = parseTime(startStr);
  const end = parseTime(endStr);

  if (now > end) return 'past';
  if (now >= start && now <= end) return 'current';
  return 'future';
};

export const getStatusColor = (status: PeriodStatus): string => {
  switch (status) {
    case 'past': return '#22c55e'; // Green
    case 'current': return '#ef4444'; // Red
    case 'future': return '#000000'; // Black
    default: return '#000000';
  }
};
