import { provider } from '@richicoder1/cdk-tcr';
import { z } from 'zod';

export const onEvent = provider()
    .resource('Custom::ExampleResource', {
        schema: z.object({
            path: z.string(),
            optionalBool: z.boolean().optional(),
        }),
        async create(properties) {
            // create the thing
            return {
                physicalResourceId: 'some-id',
            };
        },
        async update(id, properties, oldProperties) {
            return {};
        },
        async delete(id, properties) {
            return {};
        },
    })
    .build();
