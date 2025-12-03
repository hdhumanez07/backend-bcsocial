import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
export class CreateProductDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(255, { message: 'Name cannot exceed 255 characters' })
  name: string;
  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description is required' })
  description: string;
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must be a number with maximum 2 decimal places' },
  )
  @IsPositive({ message: 'Price must be a positive number' })
  @Type(() => Number)
  price: number;
  @IsInt({ message: 'Stock must be an integer' })
  @Min(0, { message: 'Stock cannot be negative' })
  @Type(() => Number)
  stock: number;
}
