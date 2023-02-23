import { z } from "zod";

export const BaseRequest = z.object({
  requestType: z.enum(["Create", "Update", "Delete"]),
  logicalResourceId: z.string(),
  // Allow any, overwritten later
  resourceProperties: z.record(z.unknown()),
  resourceType: z.string(),
  requestId: z.string(),
  stackId: z.string(),
}).passthrough();

export const CfResponse = z.object({
  physicalResourceId: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  noEcho: z.boolean().optional(),
}).passthrough();

export const CreateRequest = BaseRequest.extend({});
export const UpdateRequest = BaseRequest.extend({
  physicalResourceId: z.string(),
  // Allow any, overwritten later
  oldResourceProperties: z.record(z.unknown()),
});
export const DeleteRequest = BaseRequest.extend({
  physicalResourceId: z.string(),
});

