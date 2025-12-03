import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;
  private readonly REFRESH_TOKEN_EXPIRY_MINUTES = 10;
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
  ) {}
  async register(registerDto: RegisterDto): Promise<{
    message: string;
    user: { id: string; username: string; email: string };
  }> {
    const { username, email, password } = registerDto;
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });
    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException('El username ya está en uso');
      }
      if (existingUser.email === email) {
        throw new ConflictException('El email ya está en uso');
      }
    }
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
    });
    try {
      await this.userRepository.save(user);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = user;
      return {
        message: 'User registered successfully',
        user: userWithoutPassword,
      };
    } catch {
      throw new InternalServerErrorException('Error registering user');
    }
  }
  async login(loginDto: LoginDto): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    user: { id: string; username: string; email: string };
  }> {
    const { username, password } = loginDto;
    const user = await this.userRepository.findOne({
      where: { username },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      iat: Math.floor(Date.now() / 1000),
    };
    const access_token = await this.jwtService.signAsync(payload);
    const refresh_token = await this.generateRefreshToken(user);
    return {
      access_token,
      refresh_token,
      expires_in: 300,
      token_type: 'Bearer',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }
  private async generateRefreshToken(user: User): Promise<string> {
    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + this.REFRESH_TOKEN_EXPIRY_MINUTES,
    );
    const refreshToken = this.refreshTokenRepository.create({
      token,
      expiresAt,
      user,
      userId: user.id,
    });
    await this.refreshTokenRepository.save(refreshToken);
    return token;
  }
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }> {
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }
    if (storedToken.isRevoked) {
      throw new UnauthorizedException('Refresh token revocado');
    }
    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expirado');
    }
    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }
    storedToken.usedAt = new Date();
    await this.refreshTokenRepository.save(storedToken);
    const payload = {
      sub: storedToken.user.id,
      username: storedToken.user.username,
      email: storedToken.user.email,
      iat: Math.floor(Date.now() / 1000),
    };
    const access_token = await this.jwtService.signAsync(payload);
    const new_refresh_token = await this.generateRefreshToken(storedToken.user);
    storedToken.isRevoked = true;
    await this.refreshTokenRepository.save(storedToken);
    return {
      access_token,
      refresh_token: new_refresh_token,
      expires_in: 300,
      token_type: 'Bearer',
    };
  }
  async logout(userId: string): Promise<{ message: string }> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
    return { message: 'Sesión cerrada exitosamente' };
  }
  async cleanExpiredTokens(): Promise<void> {
    await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
  async validateUser(userId: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });
    return user || null;
  }
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }
}
