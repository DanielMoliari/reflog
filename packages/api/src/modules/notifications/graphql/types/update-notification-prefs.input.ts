import { Field, InputType } from '@nestjs/graphql'
import { IsBoolean, IsOptional } from 'class-validator'

@InputType()
export class UpdateNotificationPrefsInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  streakAlertsEnabled?: boolean
}
