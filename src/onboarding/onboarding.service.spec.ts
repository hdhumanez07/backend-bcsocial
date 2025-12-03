import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from './onboarding.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Onboarding, OnboardingStatus } from './entities/onboarding.entity';
import { Repository } from 'typeorm';
import { EncryptionService } from '../common/encryption/encryption.service';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
describe('OnboardingService', () => {
  let service: OnboardingService;
  let repository: Repository<Onboarding>;
  let encryptionService: EncryptionService;
  const mockOnboarding = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'John Doe',
    document: 'encrypted-document',
    documentHash: 'hash123',
    email: 'john@example.com',
    initialAmount: 100000,
    status: OnboardingStatus.REQUESTED,
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
  };
  const mockEncryptionService = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    hash: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: getRepositoryToken(Onboarding),
          useValue: mockRepository,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();
    service = module.get<OnboardingService>(OnboardingService);
    repository = module.get<Repository<Onboarding>>(
      getRepositoryToken(Onboarding),
    );
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('create', () => {
    it('should create a new onboarding with encrypted document', async () => {
      const createDto = {
        name: 'John Doe',
        document: '123456789',
        email: 'john@example.com',
        initialAmount: 100000,
      };
      const userId = 'user-123';
      mockRepository.findOne
        .mockResolvedValueOnce(null) // verificación de email
        .mockResolvedValueOnce(null); // verificación del hash del documento
      mockEncryptionService.hash.mockReturnValue('hash123');
      mockEncryptionService.encrypt.mockResolvedValue('encrypted-document');
      mockRepository.create.mockReturnValue(mockOnboarding);
      mockRepository.save.mockResolvedValue(mockOnboarding);
      const result = await service.create(createDto, userId);
      expect(result).toEqual(mockOnboarding);
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
        createDto.document,
      );
      expect(mockRepository.save).toHaveBeenCalled();
    });
    it('should throw ConflictException for duplicate email', async () => {
      const createDto = {
        name: 'John Doe',
        document: '123456789',
        email: 'existing@example.com',
        initialAmount: 100000,
      };
      mockRepository.findOne.mockResolvedValue(mockOnboarding);
      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        ConflictException,
      );
    });
    it('should throw ConflictException for duplicate document', async () => {
      const createDto = {
        name: 'John Doe',
        document: '123456789',
        email: 'new@example.com',
        initialAmount: 100000,
      };
      mockRepository.findOne
        .mockResolvedValueOnce(null) // verificación de email
        .mockResolvedValueOnce(mockOnboarding); // verificación del hash del documento
      mockEncryptionService.hash.mockReturnValue('hash123');
      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        ConflictException,
      );
    });
  });
  describe('findAllByUser', () => {
    it('should return decrypted onboardings for user', async () => {
      const onboardings = [mockOnboarding];
      mockRepository.find.mockResolvedValue(onboardings);
      mockEncryptionService.decrypt.mockResolvedValue('123456789');
      const result = await service.findAllByUser('user-123');
      expect(result).toHaveLength(1);
      expect(result[0].document).toBe('123456789');
      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
        'encrypted-document',
      );
    });
  });
  describe('findOne', () => {
    it('should return decrypted onboarding by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockOnboarding);
      mockEncryptionService.decrypt.mockResolvedValue('123456789');
      const result = await service.findOne(mockOnboarding.id, 'user-123');
      expect(result.document).toBe('123456789');
      expect(mockEncryptionService.decrypt).toHaveBeenCalled();
    });
    it('should throw BadRequestException for invalid UUID', async () => {
      await expect(service.findOne('invalid-uuid', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
    it('should throw NotFoundException when onboarding not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(
        service.findOne(mockOnboarding.id, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
    it('should throw ForbiddenException when user does not own onboarding', async () => {
      mockRepository.findOne.mockResolvedValue(mockOnboarding);
      await expect(
        service.findOne(mockOnboarding.id, 'different-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
  describe('updateStatus', () => {
    it('should update onboarding status', async () => {
      const updateDto = { status: OnboardingStatus.IN_PROGRESS };
      const updatedOnboarding = { ...mockOnboarding, ...updateDto };
      mockRepository.findOne.mockResolvedValue(mockOnboarding);
      mockEncryptionService.decrypt.mockResolvedValue('123456789');
      mockRepository.save.mockResolvedValue(updatedOnboarding);
      const result = await service.updateStatus(
        mockOnboarding.id,
        updateDto,
        'user-123',
      );
      expect(result.status).toBe(OnboardingStatus.IN_PROGRESS);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });
  describe('remove', () => {
    it('should soft delete onboarding', async () => {
      mockRepository.findOne.mockResolvedValue(mockOnboarding);
      mockRepository.softRemove.mockResolvedValue(mockOnboarding);
      await service.remove(mockOnboarding.id, 'user-123');
      expect(mockRepository.softRemove).toHaveBeenCalledWith(mockOnboarding);
    });
    it('should throw NotFoundException when onboarding not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(
        service.remove(mockOnboarding.id, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
    it('should throw ForbiddenException when user does not own onboarding', async () => {
      mockRepository.findOne.mockResolvedValue(mockOnboarding);
      await expect(
        service.remove(mockOnboarding.id, 'different-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
