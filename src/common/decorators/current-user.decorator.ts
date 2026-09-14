import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { CustomerProfile } from "../../types";

export const CurrentUser = createParamDecorator(
  (data: keyof CustomerProfile | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CustomerProfile | undefined;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
