export const EXPERIENCE_LEVELS = Object.freeze(['entry', 'intermediate', 'expert']);

export const WEEKLY_DAYS = Object.freeze(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

export const ONLINE_STATUSES = Object.freeze(['online', 'offline', 'busy']);

export const CONVERSATION_ESCROW_STATUSES = Object.freeze([
  'none',
  'pending',
  'locked',
  'released',
]);

export const MESSAGE_TYPES = Object.freeze([
  'text',
  'file',
  'system_agreement',
  'system_escrow',
  'system_deliverable',
  'system_payment',
]);

export const AGREEMENT_STATUSES = Object.freeze(['pending', 'approved', 'rejected']);

export const DELIVERABLE_STATUSES = Object.freeze(['submitted', 'approved', 'rejected']);

export const MESSAGE_ESCROW_STATUSES = Object.freeze(['locked', 'released', 'refunded']);

export const PROJECT_STATUSES = Object.freeze([
  'discussion',
  'agreement_pending',
  'escrow_funded',
  'in_progress',
  'delivered',
  'completed',
  'cancelled',
  'disputed',
]);

export const PROJECT_ESCROW_STATUSES = Object.freeze([
  'pending',
  'locked',
  'released',
  'refunded',
  'split',
]);

export const TRANSACTION_TYPES = Object.freeze([
  'escrow_fund',
  'escrow_release',
  'fee',
  'gst',
  'withdrawal',
  'refund',
]);

export const PROJECT_REQUIRED_TRANSACTION_TYPES = Object.freeze([
  'escrow_fund',
  'escrow_release',
  'fee',
  'gst',
  'refund',
]);

export const TRANSACTION_STATUSES = Object.freeze(['pending', 'completed', 'failed']);

export const PAYMENT_GATEWAYS = Object.freeze(['razorpay', 'stripe']);

export const ESCROW_STATUSES = Object.freeze(['locked', 'released', 'refunded', 'split']);

export const NOTIFICATION_TYPES = Object.freeze([
  'message',
  'agreement',
  'escrow',
  'deliverable',
  'payment',
  'review',
  'system',
]);

export const DISPUTE_STATUSES = Object.freeze(['open', 'in_review', 'resolved']);

export const LEAKAGE_DETECTED_TYPES = Object.freeze(['phone', 'email', 'upi', 'link']);

export const LEAKAGE_ACTIONS = Object.freeze(['blocked', 'masked', 'warned']);

export const REQUIREMENT_STATUSES = Object.freeze(['open', 'closed', 'cancelled']);
