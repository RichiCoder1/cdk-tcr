import { CfResponse, BaseRequest, CreateRequest, DeleteRequest, UpdateRequest } from './schemas';
import { z } from "zod";
import camelcaseKeys from 'camelcase-keys';
import { fromZodError } from 'zod-validation-error';
import type { ValidationError } from 'zod-validation-error';

export type ResourceResponse = z.infer<typeof CfResponse>;

export interface ResourceOptions<Schema extends z.Schema> {
  readonly id: string;
  readonly schema: Schema;
  readonly onCreate: (properties: z.infer<Schema>, event: z.infer<typeof CreateRequest>) => Promise<ResourceResponse>;
  readonly onUpdate: (id: string, properties: z.infer<Schema>, oldProperties: z.infer<Schema>, event: z.infer<typeof UpdateRequest>) => Promise<ResourceResponse>;
  readonly onDelete: (id: string, properties: z.infer<Schema>, event: z.infer<typeof DeleteRequest>) => Promise<void | Record<string, unknown>>;
  readonly onError?: (error: ValidationError, event: z.infer<typeof BaseRequest>) => void | Error;
}

export function handler<Schema extends z.Schema>(options: ResourceOptions<Schema>) {
  const requestSchema = BaseRequest.extend({ id: z.literal(options.id) });
  return async function customResourceHandler(rawEvent: Record<string, any>) {
    const reformattedEvent = camelcaseKeys(rawEvent, { deep: true });

    const requestParseResult = requestSchema.safeParse(reformattedEvent);
    if (!requestParseResult.success) {
      console.error('Got an invalid request from the CloudFormation framework');
      console.error(requestParseResult.error);
      throw fromZodError(requestParseResult.error);
    }

    const event = requestParseResult.data;
    const propertiesParseResult = options.schema.safeParse(event.resourceProperties);
    if (!propertiesParseResult.success) {
      console.error('Failed to validate ResourceProperties for incoming request.');
      console.error(propertiesParseResult.error);
      let error: Error = fromZodError(propertiesParseResult.error);
      if (options.onError) {
        const result = options.onError(error as ValidationError, event);
        if (result) {
          error = result;
        }
      }
      throw error;
    }

    const properties = propertiesParseResult.data;

    let response: ResourceResponse;
    switch (event.requestType) {
      case 'Create':
        const createEvent = CreateRequest.parse(event);
        response = await options.onCreate(properties, createEvent);
      case 'Update':
        const updateEvent = UpdateRequest.parse(event);
        // We don't do the same error handling here as (presumably) the properties were already validated.
        const oldProperties = options.schema.parse(updateEvent.oldResourceProperties);
        response = await options.onUpdate(updateEvent.physicalResourceId, properties, oldProperties, updateEvent);
      case 'Delete':
        const deleteEvent = UpdateRequest.parse(event);
        response = await options.onDelete(deleteEvent.physicalResourceId, properties, deleteEvent) ?? {};
    }
    return camelcaseKeys(response, { deep: true, pascalCase: true });
  }
}

