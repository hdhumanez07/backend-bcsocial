import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
jest.mock('bcrypt');
describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;
  let jwtService: JwtService;
  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedPassword123',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockRefreshTokenRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = module.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken),
    );
    jwtService = module.get<JwtService>(JwtService);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123',
      };
      mockUserRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      const createdUser = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'hashedPassword',
      };
      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockImplementation((user) => {
        user.id = '550e8400-e29b-41d4-a716-446655440001';
        user.isActive = true;
        user.createdAt = new Date();
        user.updatedAt = new Date();
        return Promise.resolve(user);
      });
      const result = await service.register(registerDto);
      expect(result.message).toBe('User registered successfully');
      expect(result.user).toHaveProperty('id');
      expect(result.user.username).toBe(registerDto.username);
      expect(result.user).not.toHaveProperty('password');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });
    it('should throw ConflictException if username exists', async () => {
      const registerDto = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'Password123',
      };
      const existingUser = {
        ...mockUser,
        username: 'existinguser',
      };
      mockUserRepository.findOne.mockResolvedValue(existingUser);
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
    it('should throw ConflictException if email exists', async () => {
      const registerDto = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'Password123',
      };
      const existingUser = {
        ...mockUser,
        email: 'existing@example.com',
      };
      mockUserRepository.findOne.mockResolvedValue(existingUser);
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
  describe('login', () => {
    it('should return access token and refresh token', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'Password123',
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');
      mockRefreshTokenRepository.create.mockReturnValue({});
      mockRefreshTokenRepository.save.mockResolvedValue({
        token: 'mock-refresh-token',
      });
      const result = await service.login(loginDto);
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.token_type).toBe('Bearer');
      expect(result.expires_in).toBe(300);
      expect(result.user).toHaveProperty('id');
      expect(result.user.username).toBe(mockUser.username);
    });
    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'WrongPassword',
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
    it('should throw UnauthorizedException for non-existent user', async () => {
      const loginDto = {
        username: 'nonexistent',
        password: 'Password123',
      };
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
    it('should throw UnauthorizedException for inactive user', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'Password123',
      };
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
  describe('validateUser', () => {
    it('should return user for valid userId', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.validateUser(mockUser.id);
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id, isActive: true },
      });
    });
    it('should return null for inactive user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const result = await service.validateUser(mockUser.id);
      expect(result).toBeNull();
    });
    it('should return null for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const result = await service.validateUser('non-existent-id');
      expect(result).toBeNull();
    });
  });
});
