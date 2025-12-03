import { IsEnum, IsNotEmpty } from 'class-validator';
import { OnboardingStatus } from '../entities/onboarding.entity';
export class UpdateOnboardingStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(OnboardingStatus, {
    message: `Status must be one of: ${Object.values(OnboardingStatus).join(', ')}`,
  })
  status: OnboardingStatus;
}
