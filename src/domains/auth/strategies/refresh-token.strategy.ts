import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

type JwtPayload = {
  sub: string;
  email: string;
};

type RequestWithRefreshToken = Request & {
  body: {
    refreshToken?: string;
  };
};

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      secretOrKey: configService.get<string>('jwt.refreshSecret') ?? '',
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(req: RequestWithRefreshToken, payload: JwtPayload) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const refreshToken: string | undefined = req.body.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token no proporcionado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Usuario no autorizado');
    }

    // Explicit return type satisfies ESLint
    const result: { sub: string; email: string; refreshToken: string } = {
      sub: payload.sub,
      email: payload.email,
      refreshToken: refreshToken,
    };

    return result;
  }
}
