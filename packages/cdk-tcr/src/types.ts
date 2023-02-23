import { z } from "zod";

export const string = z.string();
export const number = z.coerce.number();
export const boolean = z.preprocess((val: unknown) => {
    if (typeof val === "string") {
        if (val === "true") {
          return true;
        }
        if (val === "false") {
          return false;
        }
    }
    return val;
}, z.boolean());
export const date = z.coerce.date();
export const bigint = z.coerce.bigint();

export function literal<Output, Schema extends z.ZodSchema<Output>, Value extends z.Primitive & z.infer<Schema>>(value: Value, schema: Schema) {
  return z.preprocess(val => schema.parse(val), z.literal(value));
}