import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.entity';
import { UpdateOnboardingStatusDto } from './dto/update-onboarding-status.dto';
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createOnboardingDto: CreateOnboardingDto,
    @GetUser() user: User,
  ) {
    return this.onboardingService.create(createOnboardingDto, user.id);
  }
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@GetUser() user: User) {
    return this.onboardingService.findAllByUser(user.id);
  }
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.onboardingService.findOne(id, user.id);
  }
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOnboardingStatusDto,
    @GetUser() user: User,
  ) {
    return this.onboardingService.updateStatus(id, updateStatusDto, user.id);
  }
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.onboardingService.remove(id, user.id);
  }
}
