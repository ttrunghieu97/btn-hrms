import type { UserResponseDto } from '@/api/generated/model';

export type User = UserResponseDto;

export type UserFilters = {
  page?: number;
  limit?: number;
  roles?: string;
  search?: string;
  sort?: string;
};

export type UsersResponse = {
  success: boolean;
  time: string;
  message: string;
  total_users: number;
  offset: number;
  limit: number;
  users: User[];
};

export type UserMutationPayload = {
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
};
