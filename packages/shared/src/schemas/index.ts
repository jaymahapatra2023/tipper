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

export const hotelSettingsSchema = z.object({
  suggestedAmounts: z.array(z.number().min(100)).min(1).max(5),
  minTipAmount: z.number().min(100),
  maxTipAmount: z.number().min(100),
  poolingEnabled: z.boolean(),
  poolingType: z.enum(['equal', 'weighted']).optional(),
  currency: z.string().length(3).default('usd'),
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

// Type exports from schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TipCreateInput = z.infer<typeof tipCreateSchema>;
export type HotelRegisterInput = z.infer<typeof hotelRegisterSchema>;
export type HotelSettingsInput = z.infer<typeof hotelSettingsSchema>;
export type RoomCreateInput = z.infer<typeof roomCreateSchema>;
export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
export type AssignmentCreateInput = z.infer<typeof assignmentCreateSchema>;
