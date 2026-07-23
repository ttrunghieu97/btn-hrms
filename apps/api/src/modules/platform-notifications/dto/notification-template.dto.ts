import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export class CreateNotificationTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsNotEmpty()
  body: string;
}

export class UpdateNotificationTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  body?: string;
}



