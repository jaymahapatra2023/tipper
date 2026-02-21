import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(1, 'Name is required').max(100),
  role: z.enum(['guest', 'staff', 'hotel_admin', 'platform_admin']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// Tip schemas
export const tipCreateSchema = z
  .object({
    qrCode: z.string().min(1),
    roomId: z.string().uuid(),
    guestName: z.string().max(100).optional(),
    guestEmail: z.string().email().optional(),
    checkInDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
    checkOutDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
    tipMethod: z.enum(['per_day', 'flat']),
    amountPerDay: z.number().min(1).optional(),
    totalAmount: z.number().min(100, 'Minimum tip is $1.00'),
    message: z.string().max(500).optional(),
    guestLatitude: z.number().min(-90).max(90).optional(),
    guestLongitude: z.number().min(-180).max(180).optional(),
    guestLocationAccuracy: z.number().min(0).optional(),
  })
  .refine(
    (data) => new Date(data.checkOutDate) > new Date(data.checkInDate),
    'Check-out date must be after check-in date',
  );

export const tipReceiptSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Hotel schemas
export const hotelRegisterSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  zipCode: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  email: z.string().email(),
  website: z.string().url().optional(),
  totalRooms: z.number().int().min(1),
  totalFloors: z.number().int().min(1),
});

// Hotel onboarding (self-service registration)
export const hotelOnboardSchema = z.object({
  hotelName: z.string().min(1, 'Hotel name is required').max(200),
  name: z.string().min(1, 'Your name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const hotelSettingsSchema = z.object({
  suggestedAmounts: z.array(z.number().min(100)).min(1).max(5),
  minTipAmount: z.number().min(100),
  maxTipAmount: z.number().min(100),
  poolingEnabled: z.boolean(),
  poolingType: z.enum(['equal', 'weighted']).optional(),
  currency: z.string().length(3).default('usd'),
  mfaRequired: z.boolean().optional(),
  geofenceEnabled: z.boolean().optional(),
  geofenceLatitude: z.number().min(-90).max(90).optional(),
  geofenceLongitude: z.number().min(-180).max(180).optional(),
  geofenceRadius: z.number().min(50).max(5000).optional(),
});

// Room schemas
export const roomCreateSchema = z.object({
  roomNumber: z.string().min(1).max(20),
  floor: z.number().int().min(0),
  roomType: z.string().max(50).optional(),
});

export const roomBulkCreateSchema = z.object({
  rooms: z.array(roomCreateSchema).min(1).max(500),
});

// Staff schemas
export const staffCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
});

export const staffImportSchema = z.object({
  staff: z.array(staffCreateSchema).min(1).max(500),
});

// Assignment schemas
export const assignmentCreateSchema = z.object({
  staffMemberId: z.string().uuid(),
  roomId: z.string().uuid(),
  assignedDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
});

export const assignmentBulkCreateSchema = z.object({
  assignments: z.array(assignmentCreateSchema).min(1),
});

// Platform schemas
export const platformSettingsSchema = z.object({
  defaultPlatformFeePercent: z.number().min(0).max(100),
});

export const hotelApprovalSchema = z.object({
  status: z.enum(['approved', 'suspended']),
  note: z.string().max(500).optional(),
});

// Query schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), 'Invalid date')
    .optional(),
  endDate: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), 'Invalid date')
    .optional(),
});

// MFA schemas
export const mfaVerifySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
  mfaToken: z.string().min(1),
});

export const mfaRecoverySchema = z.object({
  recoveryCode: z.string().min(1, 'Recovery code is required'),
  mfaToken: z.string().min(1),
});

export const mfaSetupVerifySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

export const adminResetPasswordSchema = z.object({
  userId: z.string().uuid(),
});

// Hotel profile schema (onboarding step 1)
export const hotelProfileSchema = z.object({
  name: z.string().min(1, 'Hotel name is required').max(200),
  address: z.string().min(1, 'Address is required').max(500),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  zipCode: z.string().min(1, 'ZIP code is required').max(20),
  country: z.string().min(1, 'Country is required').max(100),
  phone: z.string().min(1, 'Phone is required').max(20),
  email: z.string().email('Invalid email'),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
});

// Room bulk generate schema (onboarding step 2)
export const roomBulkGenerateSchema = z
  .object({
    floor: z.number().int().min(0, 'Floor must be 0 or above'),
    startRoom: z.number().int().min(1, 'Start room is required'),
    endRoom: z.number().int().min(1, 'End room is required'),
    roomType: z.string().max(50).optional(),
    prefix: z.string().max(10).optional(),
  })
  .refine((data) => data.endRoom >= data.startRoom, {
    message: 'End room must be >= start room',
    path: ['endRoom'],
  })
  .refine((data) => data.endRoom - data.startRoom + 1 <= 100, {
    message: 'Maximum 100 rooms per batch',
    path: ['endRoom'],
  });

// Type exports from schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TipCreateInput = z.infer<typeof tipCreateSchema>;
export type HotelRegisterInput = z.infer<typeof hotelRegisterSchema>;
export type HotelOnboardInput = z.infer<typeof hotelOnboardSchema>;
export type HotelSettingsInput = z.infer<typeof hotelSettingsSchema>;
export type RoomCreateInput = z.infer<typeof roomCreateSchema>;
export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
export type AssignmentCreateInput = z.infer<typeof assignmentCreateSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
export type MfaRecoveryInput = z.infer<typeof mfaRecoverySchema>;
export type MfaSetupVerifyInput = z.infer<typeof mfaSetupVerifySchema>;
export type HotelProfileInput = z.infer<typeof hotelProfileSchema>;
export type RoomBulkGenerateInput = z.infer<typeof roomBulkGenerateSchema>;
