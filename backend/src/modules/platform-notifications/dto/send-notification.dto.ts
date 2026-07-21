import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { NotificationType } from './notification-template.dto';

export class SendNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  templateName?: string;

  @IsEnum(NotificationType)
  @IsOptional()
  preferredType?: NotificationType;
  
  @IsString()
  @IsOptional()
  subject?: string;
  
  @IsString()
  @IsOptional()
  body?: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, unknown>  ;
}



