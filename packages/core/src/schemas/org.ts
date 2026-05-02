import { z } from "zod";

export const OrganizationSchema = z.object({
  id: z.string().cuid2(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  tier: z.enum(["free", "pro", "enterprise"]).default("free"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const CreateOrganizationSchema = OrganizationSchema.pick({
  name: true,
  slug: true,
});

export type CreateOrganizationInput = z.infer<
  typeof CreateOrganizationSchema
>;
