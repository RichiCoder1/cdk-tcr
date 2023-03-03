
import { z } from "zod"; 
import { Construct } from "constructs";
import { CustomResource, RemovalPolicy } from "aws-cdk-lib/core";
import camelcaseKeys from "camelcase-keys";
import { getOrCreateProvider, getRegisteredServiceToken } from "./utils";
import { ResourceDefinition } from './resourceDefinition';

export type TypedCustomResourceOptions<Schema extends z.Schema> = {
  readonly resource: ResourceDefinition<Schema>;
  readonly provider?: string | { parameterPrefix: string, providerId: string };
  readonly providerClass?: new (scope: Construct, id: string) => { readonly serviceToken: string };
}

export type TypedCustomResourcePropsBase<ResourceDef extends ResourceDefinition<Schema>, Schema extends z.Schema = z.Schema<any>> = z.infer<ResourceDef['schema']> & { 
  readonly removalPolicy?: RemovalPolicy;
};

export abstract class TypedCustomResource<Props extends TypedCustomResourcePropsBase<ResourceDef>, ResourceDef extends ResourceDefinition<Schema>, Schema extends z.Schema = z.Schema<any>> extends Construct {
  readonly resource: CustomResource;

  constructor(scope: Construct, id: string, props: Props, options: TypedCustomResourceOptions<Schema>) {
    super(scope, id);

    const { resource } = options;

    const validationResult = resource.schema.safeParse(props);
    if (!validationResult.success) {
      throw new Error(validationResult.error.message);
    }

    const { removalPolicy, ...rest } = props;

    const pascalProps = camelcaseKeys(rest, { pascalCase: true });

    let serviceToken: string;
    if (options.provider) {
      serviceToken = getRegisteredServiceToken(this, options.provider);
    } else if (options.providerClass) {
      serviceToken = getOrCreateProvider(this, options.providerClass);
    } else {
      throw new Error("Either serviceToken or providerClass must be provided.");
    }

    this.resource = new CustomResource(this, "Resource", {
      serviceToken: serviceToken,
      resourceType: resource.typeName,
      properties: pascalProps,
      removalPolicy,
    });
  }
}
