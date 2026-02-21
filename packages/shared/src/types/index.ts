export enum UserRole {
  GUEST = 'guest',
  STAFF = 'staff',
  HOTEL_ADMIN = 'hotel_admin',
  PLATFORM_ADMIN = 'platform_admin',
}

export enum HotelStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
}

export enum QrCodeStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

export enum TipMethod {
  PER_DAY = 'per_day',
  FLAT = 'flat',
}

export enum TipStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PoolingType {
  EQUAL = 'equal',
  WEIGHTED = 'weighted',
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  hotelId?: string;
}

export interface QrResolveResponse {
  hotelName: string;
  hotelId: string;
  roomNumber: string;
  roomId: string;
  floor: number;
  suggestedAmounts: number[];
  minTip: number;
  maxTip: number;
  currency: string;
  geofenceEnabled?: boolean;
  geofenceLatitude?: number;
  geofenceLongitude?: number;
  geofenceRadius?: number;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  feedbackTags?: string[];
}

export interface TipCreateRequest {
  qrCode: string;
  roomId: string;
  guestName?: string;
  guestEmail?: string;
  checkInDate: string;
  checkOutDate: string;
  tipMethod: TipMethod;
  amountPerDay?: number;
  totalAmount: number;
  message?: string;
}

export interface TipConfirmation {
  tipId: string;
  hotelName: string;
  roomNumber: string;
  amount: number;
  currency: string;
  status: TipStatus;
  createdAt: string;
}

export interface StaffDashboard {
  totalEarnings: number;
  periodEarnings: number;
  tipCount: number;
  averageRating?: number;
  ratedTipCount?: number;
  recentTips: StaffTipView[];
  pendingAssignments: number;
}

export interface StaffTipView {
  id: string;
  roomNumber: string;
  amount: number;
  message?: string;
  rating?: number;
  feedbackTags?: string[];
  date: string;
}

export interface AdminAnalytics {
  totalTips: number;
  totalAmount: number;
  averageTip: number;
  averageRating?: number;
  ratedTipCount?: number;
  ratingDistribution?: { rating: number; count: number }[];
  tipsByRoom: { roomNumber: string; count: number; total: number }[];
  tipsByStaff: { staffName: string; count: number; total: number; averageRating?: number }[];
  tipsByDate: { date: string; count: number; total: number }[];
  locationVerifiedCount?: number;
  locationVerifiedPercent?: number;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
  recoveryCodes: string[];
}

export interface LoginResponse {
  user?: { id: string; email: string; name: string; role: UserRole };
  accessToken?: string;
  mfaRequired?: boolean;
  mfaToken?: string;
  needsMfaSetup?: boolean;
}

export interface HotelRegisterRequest {
  hotelName: string;
  name: string;
  email: string;
  password: string;
}

export interface PayoutView {
  id: string;
  staffName: string;
  staffEmail: string;
  hotelName: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  failureReason?: string;
  stripeTransferId?: string;
  distributionCount: number;
  processedAt?: string;
  createdAt: string;
}

export interface PayoutAnalytics {
  totalPaid: number;
  totalPending: number;
  totalFailed: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  last30DaysPaid: number;
}

export interface PayoutProcessResult {
  processed: number;
  failed: number;
  skipped: number;
}

export interface StaffPayoutSummary {
  pendingEarnings: number;
  totalPaidOut: number;
  lastPayoutDate?: string;
  lastPayoutAmount?: number;
}

export interface StaffMilestone {
  id: string;
  label: string;
  description: string;
  achieved: boolean;
  progress: number; // 0-100
  icon: string;
}

export interface DailyEarningsData {
  date: string;
  earnings: number;
  tipCount: number;
}

export interface StaffPerformanceMetrics {
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  totalEarnings: number;
  tipCount: number;
  averageTip: number;
  averageRating?: number;
  weekTrend: number; // % change vs last week
  monthTrend: number; // % change vs last month
  dailyData: DailyEarningsData[];
  milestones: StaffMilestone[];
}

export interface LeaderboardEntry {
  rank: number;
  staffName: string;
  tipCount: number;
  totalEarnings: number;
  averageRating?: number;
  isCurrentUser: boolean;
}

export interface StaffPerformanceResponse {
  metrics: StaffPerformanceMetrics;
  leaderboard?: LeaderboardEntry[];
}

export interface ReceiptData {
  tipId: string;
  hotelName: string;
  hotelAddress: string;
  roomNumber: string;
  guestName?: string;
  totalAmount: number;
  currency: string;
  tipMethod: string;
  checkInDate: string;
  checkOutDate: string;
  paidAt: string;
  staffNames: string[];
  message?: string;
  rating?: number;
  feedbackTags?: string[];
}
