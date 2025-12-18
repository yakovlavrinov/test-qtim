import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      switch (key) {
        case 'JWT_ACCESS_SECRET':
          return 'access-secret';
        case 'JWT_REFRESH_SECRET':
          return 'refresh-secret';
        case 'JWT_ACCESS_EXPIRES_IN':
          return 900;
        case 'JWT_REFRESH_EXPIRES_IN':
          return 604800;
        default:
          throw new Error('Unknown config key');
      }
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({ id: 'user-uuid-1' });

      const result = await service.register('new@user.com', 'strongPass123');

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('new@user.com');
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@user.com' }),
      );
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
      expect(mockUsersService.update).toHaveBeenCalledWith('user-uuid-1', {
        refreshTokenHash: expect.any(String) as unknown,
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register('existing@user.com', 'pass'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      const hashed = await bcrypt.hash('correctPass', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-uuid-1',
        password: hashed,
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login('user@user.com', 'correctPass');

      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
      expect(mockUsersService.update).toHaveBeenCalled();
    });

    it('should reject invalid email or password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login('wrong@user.com', 'any')).rejects.toThrow(
        UnauthorizedException,
      );

      mockUsersService.findByEmail.mockResolvedValue({ password: 'hash' });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login('user@user.com', 'wrongPass')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('should issue new tokens with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const userId = 'user-uuid-1';
      const hashedToken = await bcrypt.hash(refreshToken, 10);

      mockJwtService.verifyAsync.mockResolvedValue({ sub: userId });
      mockUsersService.findById.mockResolvedValue({
        id: userId,
        refreshTokenHash: hashedToken,
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.refresh(refreshToken);

      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
      expect(mockUsersService.update).toHaveBeenCalledWith(userId, {
        refreshTokenHash: expect.any(String) as unknown,
      });
    });

    it('should reject invalid or tampered refresh token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error());

      await expect(service.refresh('invalid')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should clear refresh token hash', async () => {
      await service.logout('user-uuid-1');

      expect(mockUsersService.update).toHaveBeenCalledWith('user-uuid-1', {
        refreshTokenHash: undefined,
      });
    });
  });
});
