import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

export type AuthUser = { id: number; name: string; role: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>('public', targets)) return true;
    const req = ctx.switchToHttp().getRequest();
    const h: string = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) throw new UnauthorizedException('로그인이 필요해요.');
    try {
      const p = this.jwt.verify(token);
      req.user = { id: p.sub, name: p.name, role: p.role } as AuthUser;
    } catch {
      throw new UnauthorizedException('로그인 시간이 지났어요. 다시 로그인해 주세요.');
    }
    const roles = this.reflector.getAllAndOverride<string[]>('roles', targets);
    if (roles && !roles.includes(req.user.role)) throw new ForbiddenException('관리자만 할 수 있는 일이에요.');
    return true;
  }
}
