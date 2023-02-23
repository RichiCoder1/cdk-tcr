import { CfResponse, BaseRequest, CreateRequest, DeleteRequest, UpdateRequest } from './schemas';
import { z } from "zod";
import camelcaseKeys from 'camelcase-keys';
import { fromZodError } from 'zod-validation-error';
import type { ValidationError } from 'zod-validation-error';

export type ResourceResponse = z.infer<typeof CfResponse>;
export type ResourceHandlerMap = Record<string, (event: z.infer<typeof BaseRequest>) => Promise<ResourceResponse>>;
export interface ResourceOptions<Schema extends z.Schema> {
  readonly schema: Schema;
  readonly create: (properties: z.infer<Schema>, event: z.infer<typeof CreateRequest>) => Promise<ResourceResponse>;
  readonly update: (id: string, properties: z.infer<Schema>, oldProperties: z.infer<Schema>, event: z.infer<typeof UpdateRequest>) => Promise<ResourceResponse>;
  readonly delete: (id: string, properties: z.infer<Schema>, event: z.infer<typeof DeleteRequest>) => Promise<void | Record<string, unknown>>;
  readonly onError?: (error: ValidationError, event: z.infer<typeof BaseRequest>) => void | Error;
}

export class Provider {
  readonly resources = new Map<string, (event: z.infer<typeof BaseRequest>) => Promise<ResourceResponse>>();

  resource<Schema extends z.Schema>(type: string, options: ResourceOptions<Schema>) {
    const handler = resource(options);
    this.resources.set(type, handler);
    return this;
  }

  build() {
    const resources = this.resources;
    return async function customResourceHandler(rawEvent: Record<string, any>) {
      const reformattedEvent = camelcaseKeys(rawEvent, { deep: true });
  
      const requestParseResult = BaseRequest.safeParse(reformattedEvent);
      if (!requestParseResult.success) {
        console.error('Got an invalid request from the CloudFormation framework');
        console.error(requestParseResult.error);
        throw fromZodError(requestParseResult.error);
      }
  
      const event = requestParseResult.data;
      if (!resources.has(event.resourceType)) {
        console.error('Received an event for an unknown resource type', event.resourceType);
        throw new Error(`Unknown resource type: ${event.resourceType}`);
      }
  
      const handler = resources.get(event.resourceType)!;
      const response = await handler(event);
      return camelcaseKeys(response, { deep: true, pascalCase: true });
    }
  }
}

export function provider() {
  return new Provider();
}

function resource<Schema extends z.Schema>(options: ResourceOptions<Schema>) {
  return async function customResourceHandler(event: z.infer<typeof BaseRequest>) {
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
        response = await options.create(properties, createEvent);
      case 'Update':
        const updateEvent = UpdateRequest.parse(event);
        // We don't do the same error handling here as (presumably) the properties were already validated.
        const oldProperties = options.schema.parse(updateEvent.oldResourceProperties);
        response = await options.update(updateEvent.physicalResourceId, properties, oldProperties, updateEvent);
      case 'Delete':
        const deleteEvent = UpdateRequest.parse(event);
        response = await options.delete(deleteEvent.physicalResourceId, properties, deleteEvent) ?? {};
    }
    return response;
  }
}