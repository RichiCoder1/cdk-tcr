import { provider, cf } from '@richicoder1/cdk-tcr';
import { z } from 'zod';

export const onEvent = provider()
    .resource('Custom::ExampleResource', {
        schema: z.object({
            path: cf.string,
            optionalBool: cf.boolean.optional(),
            literal: cf.literal(false, cf.boolean),
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
