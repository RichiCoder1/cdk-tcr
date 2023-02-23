# cdk-tcr
CDK TypeSafe Custom Resource Provider

## Example

```typescript
import { provider } from '@richicoder1/cdk-tcr';
import { z } from 'zod';

export const onEvent = provider()
    .resource('Custom::ExampleResource', {
        schema: z.object({
            path: z.string(),
            optionalBool: z.boolean().optional(),
        }),
        async create(properties /* : { path: string, optionalBool?: bool } */) {
            // create the thing
            return {
                physicalResourceId: 'some-id',
            };
        },
        async update(id /* string */, properties, oldProperties) {
            return {};
        },
        async delete(id, properties) {
            return {};
        },
    })
    .build();
```