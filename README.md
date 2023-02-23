# cdk-tcr
CDK TypeSafe Custom Resource Provider.

Automatically validates incoming properties from as well as providing zod helpers to handle coercing from CloudFormation's string encoding to native types as well as automatically camel casing incoming models for a native typescript feel.

## Example

```typescript
import { provider, cf } from '@richicoder1/cdk-tcr';
import { z } from 'zod';

export const onEvent = provider()
    .resource('Custom::ExampleResource', {
        schema: z.object({
            // Note the use of cf. 
            // These helpers handle automatically coercing from CloudFormation's stringified values.
            // Only necessary for primitives, all other zod types should work (though non-string enums will require a preprocess step).
            path: cf.string,
            optionalBool: cf.boolean.optional(),
            literal: cf.literal(false, cf.boolean),
        }),
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