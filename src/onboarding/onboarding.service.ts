import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Onboarding, OnboardingStatus } from './entities/onboarding.entity';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { UpdateOnboardingStatusDto } from './dto/update-onboarding-status.dto';
import { EncryptionService } from '../common/encryption/encryption.service';
@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(Onboarding)
    private readonly onboardingRepository: Repository<Onboarding>,
    private readonly encryptionService: EncryptionService,
  ) {}
  async create(
    createOnboardingDto: CreateOnboardingDto,
    userId: string,
  ): Promise<Onboarding> {
    const existingByEmail = await this.onboardingRepository.findOne({
      where: { email: createOnboardingDto.email },
    });
    if (existingByEmail) {
      throw new ConflictException(
        'A registration with this email already exists',
      );
    }
    const documentHash = this.encryptionService.hash(
      createOnboardingDto.document,
    );
    const existingByDocument = await this.onboardingRepository.findOne({
      where: { documentHash },
    });
    if (existingByDocument) {
      throw new ConflictException(
        'A registration with this document already exists',
      );
    }
    try {
      const encryptedDocument = await this.encryptionService.encrypt(
        createOnboardingDto.document,
      );
      const onboarding = this.onboardingRepository.create({
        ...createOnboardingDto,
        document: encryptedDocument,
        documentHash,
        userId,
        status: OnboardingStatus.REQUESTED,
      });
      return await this.onboardingRepository.save(onboarding);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        'Error creating onboarding',
        errorMessage,
      );
    }
  }
  async findAllByUser(userId: string): Promise<Onboarding[]> {
    try {
      const onboardings = await this.onboardingRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        relations: ['user'],
      });
      return Promise.all(
        onboardings.map(async (o) => ({
          ...o,
          document: await this.encryptionService.decrypt(o.document),
        })),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        'Error fetching onboardings',
        errorMessage,
      );
    }
  }
  async findOne(id: string, userId: string): Promise<Onboarding> {
    if (!this.isValidUUID(id)) {
      throw new BadRequestException('The provided ID is not a valid UUID');
    }
    try {
      const onboarding = await this.onboardingRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!onboarding) {
        throw new NotFoundException(`Onboarding with ID ${id} not found`);
      }
      if (onboarding.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to access this onboarding',
        );
      }
      return {
        ...onboarding,
        document: await this.encryptionService.decrypt(onboarding.document),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        'Error fetching onboarding',
        errorMessage,
      );
    }
  }
  async updateStatus(
    id: string,
    updateStatusDto: UpdateOnboardingStatusDto,
    userId: string,
  ): Promise<Onboarding> {
    if (!this.isValidUUID(id)) {
      throw new BadRequestException('The provided ID is not a valid UUID');
    }
    const onboarding = await this.onboardingRepository.findOne({
      where: { id },
    });
    if (!onboarding) {
      throw new NotFoundException(`Onboarding with ID ${id} not found`);
    }
    if (onboarding.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this onboarding',
      );
    }
    try {
      onboarding.status = updateStatusDto.status;
      const updated = await this.onboardingRepository.save(onboarding);
      return {
        ...updated,
        document: await this.encryptionService.decrypt(updated.document),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        'Error updating onboarding status',
        errorMessage,
      );
    }
  }
  async remove(id: string, userId: string): Promise<void> {
    const onboarding = await this.onboardingRepository.findOne({
      where: { id },
    });
    if (!onboarding) {
      throw new NotFoundException(`Onboarding with ID ${id} not found`);
    }
    if (onboarding.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this onboarding',
      );
    }
    try {
      await this.onboardingRepository.softRemove(onboarding);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        'Error deleting onboarding',
        errorMessage,
      );
    }
  }
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
