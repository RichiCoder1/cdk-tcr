import { Construct } from 'constructs';
import { TypedCustomResource, TypedCustomResourcePropsBase } from "@richicoder1/cdk-tcr/customResource";
import { exampleResourceDef, ExampleResourceType } from "../shared";
import { ExampleResourceProvider } from '../provider/stackProvider';

export type ExampleResourceProps = TypedCustomResourcePropsBase<ExampleResourceType>;

export class ExampleStackResource extends TypedCustomResource<ExampleResourceProps, ExampleResourceType> {
  constructor(scope: Construct, id: string, props: ExampleResourceProps) {
    super(scope, id, props, {
      resource: exampleResourceDef,
      // Will automatically create the provider if it doesn't exist, or use the existing one.
      providerClass: ExampleResourceProvider,
    });
  }
}

