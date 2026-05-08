/**
 * Organization context resolver for P3 dev auth.
 *
 * In development, users are identified via x-mandara-dev-user header.
 * This resolver maps an optional organizationId to the user's accessible org,
 * or returns a helpful error if ambiguous.
 */

import type { FastifyRequest } from "fastify";
import { prisma } from "@mandara/db";
import { MandaraError } from "./errors.js";

export interface ResolvedOrgContext {
  organizationId: string;
}

/**
 * Lightweight helper to verify the dev user belongs to a given organization.
 * Throws MandaraError(FORBIDDEN, 403) if not.
 */
export function requireOrgAccess(request: FastifyRequest, orgId: string): void {
  const user = request.devUser;
  if (!user) {
    throw new MandaraError("UNAUTHORIZED", 401, "Missing dev auth");
  }
  if (!user.organizationIds.includes(orgId)) {
    throw new MandaraError(
      "FORBIDDEN",
      403,
      "You do not have access to the specified organization."
    );
  }
}

export async function resolveOrganizationContext(
  request: FastifyRequest,
  optionalOrganizationId?: string
): Promise<ResolvedOrgContext> {
  const user = request.devUser;
  if (!user) {
    throw new MandaraError("UNAUTHORIZED", 401, "Missing dev auth");
  }

  // Look up the dev user in the DB (created during import or org creation)
  const dbUser = await prisma.user.findUnique({
    where: { externalId: user.externalId ?? user.id },
    include: {
      memberships: {
        include: { organization: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!dbUser || dbUser.memberships.length === 0) {
    throw new MandaraError(
      "ORG_REQUIRED",
      400,
      "You are not a member of any organization. Create or import an organization first."
    );
  }

  if (optionalOrganizationId) {
    const hasAccess = dbUser.memberships.some(
      (m) => m.organizationId === optionalOrganizationId
    );
    if (!hasAccess) {
      throw new MandaraError(
        "FORBIDDEN",
        403,
        "You do not have access to the specified organization."
      );
    }
    return { organizationId: optionalOrganizationId };
  }

  if (dbUser.memberships.length === 1) {
    return { organizationId: dbUser.memberships[0].organizationId };
  }

  throw new MandaraError(
    "ORG_AMBIGUOUS",
    400,
    `You belong to ${dbUser.memberships.length} organizations. Please provide an organizationId.`
  );
}
