import moment from 'moment';

export function formatDate(date: string | Date, format = 'DD MMM YYYY'): string {
  return moment(date).format(format);
}

export function formatDateTime(date: string | Date): string {
  return moment(date).format('DD MMM YYYY, hh:mm A');
}

export function formatRelativeTime(date: string | Date): string {
  return moment(date).fromNow();
}

export function formatCurrency(amount: number, currency = '₹'): string {
  return `${currency}${amount.toLocaleString('en-IN')}`;
}

export function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function getCaseStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    ACTIVE: '#2ECC71',
    PENDING: '#F39C12',
    RESOLVED: '#3498DB',
    CLOSED: '#6C757D',
    REJECTED: '#E74C3C',
  };
  return statusMap[status?.toUpperCase()] || '#6C757D';
}

export function getUserTypeLabel(userType: string): string {
  const labels: Record<string, string> = {
    ADMIN: 'Administrator',
    MEDIATOR: 'Mediator',
    CLIENT: 'Client',
  };
  return labels[userType] || userType;
}

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validatePassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (!password) return {valid: false, message: 'Password is required'};
  if (password.length < 8)
    return {valid: false, message: 'Password must be at least 8 characters'};
  return {valid: true};
}

export function validatePhone(phone: string): boolean {
  const regex = /^[6-9]\d{9}$/;
  return regex.test(phone.replace(/\s/g, ''));
}
