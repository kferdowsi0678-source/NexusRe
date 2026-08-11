import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    roles: any[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: User): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roles: user.roles?.map(r => r.name) || [],
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken.token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        roles: user.roles,
      },
    };
  }

  async generateRefreshToken(userId: string): Promise<RefreshToken> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    const expirationDays = 30; // From JWT_REFRESH_EXPIRATION
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const refreshToken = this.refreshTokenRepository.create({
      token,
      userId,
      expiresAt,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }

  async refreshAccessToken(refreshTokenString: string): Promise<{ access_token: string }> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenString, isRevoked: false },
      relations: ['user', 'user.roles'],
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > refreshToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const payload: JwtPayload = {
      sub: refreshToken.user.id,
      email: refreshToken.user.email,
      organizationId: refreshToken.user.organizationId,
      roles: refreshToken.user.roles?.map(r => r.name) || [],
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token },
      { isRevoked: true },
    );
  }

  async requestPasswordReset(email: string): Promise<string> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      // Don't reveal if user exists
      return 'If an account exists with this email, a password reset link has been sent.';
    }

    // Invalidate any existing unused tokens
    await this.passwordResetTokenRepository.update(
      { userId: user.id, isUsed: false },
      { isUsed: true },
    );

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

    const resetToken = this.passwordResetTokenRepository.create({
      token,
      userId: user.id,
      expiresAt,
    });

    await this.passwordResetTokenRepository.save(resetToken);

    // TODO: Send email with reset link
    // const resetLink = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;
    // await this.emailService.sendPasswordReset(user.email, resetLink);

    return 'If an account exists with this email, a password reset link has been sent.';
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token, isUsed: false },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Reset token has expired');
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(resetToken.userId, hashedPassword);

    // Mark token as used
    resetToken.isUsed = true;
    await this.passwordResetTokenRepository.save(resetToken);

    // Revoke all refresh tokens for this user
    await this.refreshTokenRepository.update(
      { userId: resetToken.userId },
      { isRevoked: true },
    );
  }
}
