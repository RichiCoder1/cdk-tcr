import type { z } from "zod";

export interface ResourceDefinition<Schema extends z.ZodSchema> {
  readonly schema: Schema;
  readonly typeName: string;
}