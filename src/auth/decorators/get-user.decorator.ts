import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { Request } from 'express';
interface RequestExt extends Request {
  user: User;
}
export const GetUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestExt>();
    const user = request.user;
    return data ? user[data] : user;
  },
);
