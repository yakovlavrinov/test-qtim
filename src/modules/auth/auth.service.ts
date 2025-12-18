import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.usersService.create({
      email,
      password: hashedPassword,
    });

    const tokens = await this.generateTokens(user.id);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.update(userId, {
      refreshTokenHash: undefined,
    });
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        {
          secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
        },
      );

      const user = await this.usersService.findById(payload.sub);

      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException();
      }

      const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);

      if (!isValid) {
        throw new UnauthorizedException();
      }

      const tokens = await this.generateTokens(user.id);
      await this.saveRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async generateTokens(userId: string) {
    const payload = { sub: userId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: Number(
          this.configService.getOrThrow('JWT_ACCESS_EXPIRES_IN'),
        ),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: Number(
          this.configService.getOrThrow('JWT_REFRESH_EXPIRES_IN'),
        ),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, {
      refreshTokenHash: hash,
    });
  }
}
