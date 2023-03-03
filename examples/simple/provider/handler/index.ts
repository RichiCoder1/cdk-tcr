import { provider } from '@richicoder1/cdk-tcr/handler';
import { exampleResourceDef } from '../../shared';

export const onEvent = provider()
    .resource(exampleResourceDef, {
        async create(properties) {
            // string;
            properties.path;
            // boolean | undefined;
            properties.optionalBool;
            // false;
            properties.literal;
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
