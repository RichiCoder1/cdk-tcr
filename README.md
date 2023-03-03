# cdk-tcr
CDK TypeSafe Custom Resource Provider.

Provider the following:
* Validation of incoming properties using the excellent [zod](https://zod.dev/) library.
* Automatic camel casing of incoming properties for a more Javascript/Typescript feel.
* Automatic coercion of incoming properties from CloudFormation's stringified values.
* Constructs for creating provider resources on a stack-singleton and account-wide basis.
* Base constructs for creating `CustomResource` types with type validation of inputs.

> **Note**
> This library is intended to only work with Javascript/Typescript providers and constructs.
> Support for JSII and other languages is a non-goal due to JSII's lack of flexibility and overhead around type information.
> You can use the `provider` helper to write the Provider and still get type safety, will need to write your Custom Resource manually as described in [the docs](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.custom_resources-readme.html) in order to use JSII.

## Creating a Provider Handler

To define a simple resource, you can implement the handler by first defining a `ResourceDefinition`, which is the Resource's schema and type name.

`stack/resource.ts`

```typescript
import { cf, ResourceDefinition } from '@richicoder1/cdk-tcr';
import { z } from 'zod';

// Define if using account-wide resource providers (see below)
// export const providerId = "exampleProvider";

export const exampleResourceDef = {
  schema: z.object({
    // Note the use of cf. 
    // These helpers handle automatically coercing from CloudFormation's stringified values and downcased using camelcase-keys.
    // Only necessary for primitives, all other zod types should work (though non-string enums will require a preprocess step).
    path: cf.string,
    optionalBool: cf.boolean.optional(),
    literal: cf.literal(false, cf.boolean),
  }),
  typeName: "Custom::Example::CustomResource",
} satisfies ResourceDefinition<any>;

export type ExampleResourceType = typeof exampleResourceDef;
```

Then, in your handler, you define the lifecycle of the resource using the provider builder.

`stack/handler/index.ts`

```typescript
import { provider } from "@richicoder/cdk-tcr/handler";
import { resource } from "../resource";

export const onEvent = provider()
    .resource(resource, {
        async create(properties /*: { path: string, optionalBool: bool | null, literal: false } */) {
            // create the thing
            return {
                physicalResourceId: 'some-id',
            };
        },
        async update(id /*: string */, properties, oldProperties) {
            return {};
        },
        async delete(id, properties) {
            return {};
        },
    })
    .build();
```

### Creating a Provider

You can either manually create the provider following the instructions in the [documentation](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.custom_resources-readme.html) or use the helper `TypedProvider` class:

`stack/provider.ts`

```typescript
import { Construct } from 'constructs';
import { Code } from 'aws-cdk-lib/aws-lambda';
import { TypedProvider } from "@richicoder1/cdk-tcr/provider";
import path from 'node:path';
import { providerId } from './resource';

export class ExampleResourceProvider extends TypedProvider {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      // Function defaults to node16 function
      // You can also pass in FunctionProps or an IFunction (either from the CDK or SST)
      onEvent: Code.fromAsset(path.join(__dirname, 'handler'))
    });
  }
}
```

Then you can use `TypedCustomResource` to create your new resource. This class not only wraps `CustomResource`, but automatically validates inputs so that users get immediate validation.

`stack/ExampleResource.ts`

```typescript
import { Construct } from 'constructs';
import { TypedCustomResource, TypedCustomResourcePropsBase } from "@richicoder1/cdk-tcr/customResource";
import { exampleResourceDef, ExampleResourceType } from "./resource";
import { ExampleResourceProvider } from "./provider";

export type ExampleResourceProps = TypedCustomResourcePropsBase<ExampleResourceType>;

export class ExampleResource extends TypedCustomResource<ExampleResourceProps, ExampleResourceType> {
  constructor(scope: Construct, id: string, props: ExampleResourceProps) {
    super(scope, id, props, {
      resource: exampleResourceDef,
      // Will automatically create the provider if it doesn't exist, or use the existing one.
      providerClass: ExampleResourceProvider,
    });
  }
}
```

### Using in a Stack

Now that you have your custom resource, you're ready to use it in a stack like so:

`stack/index.ts`

> *Note*
> This is using the [Serverless Stack](https://sst.dev/) style functional stack, but also works with a normal stack.

```typescript
import { StackProps } from "sst/constructs";
import { ExampleResource } from "./ExampleResource";

export function MyStack({ stack }: StackProps) {
    new ExampleResource(this, "Example", {
        // This will have type completion and validation.
        path: './example',
        literal: false,
    });
}
```

## Account-Wide Resource

If you'd like to register a provider in an account once and reuse it in multiple projects, you can use `registerAccountWide` and `provider` to share the provider.

`stack/provider.ts`

```typescript
import { Construct } from 'constructs';
import { Code } from 'aws-cdk-lib/aws-lambda';
import { TypedProvider } from "@richicoder1/cdk-tcr/provider";
import path from 'node:path';
import { providerId } from './resource';

export class ExampleResourceProvider extends TypedProvider {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      onEvent: Code.fromAsset(path.join(__dirname, 'handler')),
      // Automatically registers the account token under
      //   /cdk-tcr/providers/${providerId}
      // The prefix is configurable
      registerAccountWide: true
      providerId,
    });
  }
}
```

`stack/ExampleResource.ts`

> *Note*
> This could be, for example, shared inside an NPM package

```typescript
import { Construct } from 'constructs';
import { getRegisteredServiceToken } from '@richicoder1/cdk-tcr';
import { TypedCustomResource, TypedCustomResourcePropsBase } from "@richicoder1/cdk-tcr/customResource";
import { exampleResourceDef, ExampleResourceType, providerId } from "../shared";

export type ExampleResourceProps = TypedCustomResourcePropsBase<ExampleResourceType>;

export class ExampleResource extends TypedCustomResource<ExampleResourceProps, ExampleResourceType> {
  constructor(scope: Construct, id: string, props: ExampleResourceProps) {
    super(scope, id, props, {
      resource: exampleResourceDef,
      // Automatically looks up the SSM parameter under
      //   /cdk-tcr/providers/${providerId}
      // The prefix is configurable
      provider: providerId,
    });
  }
}
```
