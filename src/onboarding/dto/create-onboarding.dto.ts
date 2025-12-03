import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsNumber,
  IsPositive,
  MaxLength,
  MinLength,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
export class CreateOnboardingDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  @MinLength(3, { message: 'Name must have at least 3 characters' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
    message: 'Name can only contain letters and spaces',
  })
  name: string;
  @IsString({ message: 'Document must be a string' })
  @IsNotEmpty({ message: 'Document is required' })
  @MinLength(5, { message: 'Document must have at least 5 characters' })
  @MaxLength(50, { message: 'Document cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'Document can only contain letters, numbers and hyphens',
  })
  document: string;
  @IsEmail({}, { message: 'Must provide a valid email' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(100, { message: 'Email cannot exceed 100 characters' })
  email: string;
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'Initial amount must be a number with maximum 2 decimal places',
    },
  )
  @IsPositive({ message: 'Initial amount must be a positive number' })
  @Min(50000, {
    message: 'Minimum initial amount for account opening is $50,000 COP',
  })
  @Max(1000000000, {
    message:
      'Maximum initial amount allowed is $1,000,000,000 COP (anti-money laundering validation)',
  })
  @Type(() => Number)
  initialAmount: number;
}
