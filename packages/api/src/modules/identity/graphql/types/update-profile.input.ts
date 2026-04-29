import { Field, InputType } from '@nestjs/graphql'
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator'

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string
}
