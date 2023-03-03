import { Construct } from 'constructs';
import { TypedCustomResource, TypedCustomResourcePropsBase } from "@richicoder1/cdk-tcr/customResource";
import { exampleResourceDef, ExampleResourceType, providerId } from "../shared";

export type ExampleResourceProps = TypedCustomResourcePropsBase<ExampleResourceType>;

export class ExampleGlobalResource extends TypedCustomResource<ExampleResourceProps, ExampleResourceType> {
  constructor(scope: Construct, id: string, props: ExampleResourceProps) {
    super(scope, id, props, {
      resource: exampleResourceDef,
      provider: providerId,
    });
  }
}
