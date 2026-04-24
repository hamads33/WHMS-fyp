import { Badge } from '@/components/ui/badge';

const statusMap = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  executed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  dispatched: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

export function StatusBadge({ status, children }) {
  const variant = statusMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  return (
    <Badge className={variant}>
      {children || status}
    </Badge>
  );
}
