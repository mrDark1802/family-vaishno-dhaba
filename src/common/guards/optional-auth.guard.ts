import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import * as crypto from "crypto";
import { CustomerProfile, UserRole } from "../../types";

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token =
      request.cookies?.["fvd_session"] ||
      request.signedCookies?.["fvd_session"] ||
      this.extractTokenFromHeader(request);

    if (!token) {
      request.user = null;
      return true;
    }

    try {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const session = await this.prisma.session.findUnique({
        where: { tokenHash },
        include: {
          user: {
            include: {
              twoFactorAuth: { select: { enabled: true } },
              oauthAccounts: { select: { provider: true } },
            },
          },
        },
      });

      if (
        session &&
        session.expiresAt >= new Date() &&
        session.user &&
        session.user.isActive
      ) {
        const userProfile: CustomerProfile = {
          id: session.user.id,
          name: session.user.name || "Customer",
          phone: session.user.phone,
          email: session.user.email,
          role: session.user.role as UserRole,
          isTwoFactorEnabled: session.user.twoFactorAuth?.enabled || false,
          hasPassword: !!session.user.passwordHash,
          connectedProviders:
            session.user.oauthAccounts?.map((a) => a.provider) || [],
        };

        request.user = userProfile;
        request.sessionId = session.id;
      } else {
        request.user = null;
      }
    } catch {
      request.user = null;
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers["authorization"];
    if (
      authHeader &&
      typeof authHeader === "string" &&
      authHeader.startsWith("Bearer ")
    ) {
      return authHeader.substring(7).trim();
    }
    return null;
  }
}
