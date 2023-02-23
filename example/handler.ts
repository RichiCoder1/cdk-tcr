import { handler } from '../src';
import { z } from "zod";

export default handler({
  id: "Custom::ExampleResource",
  schema: z.object({
    path: z.string(),
    optionalBool: z.boolean().optional(),
  }),
  async onCreate(properties) {
    // create the thing
    return {
      physicalResourceId: "some-id",
    };
  },
  async onUpdate(properties, oldProperties) {
    return {};
  },
  async onDelete(properties) {
    return {};
  }
});