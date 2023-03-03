import { cf, ResourceDefinition } from '@richicoder1/cdk-tcr';
import { z } from 'zod';

export const providerId = "example.provider";
export const exampleResourceDef = {
  schema: z.object({
    path: cf.string,
    optionalBool: cf.boolean.optional(),
    literal: cf.literal(false, cf.boolean),
  }),
  typeName: "Custom::Example::CustomResource",
} satisfies ResourceDefinition<any>;

export type ExampleResourceType = typeof exampleResourceDef;