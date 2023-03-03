import { Construct } from 'constructs';
import { Code } from 'aws-cdk-lib/aws-lambda';
import { TypedProvider } from "@richicoder1/cdk-tcr/provider";
import path from 'node:path';
import { exampleResourceDef, providerId } from '../shared';

export class ExampleResourceProvider extends TypedProvider {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      resource: exampleResourceDef,
      onEvent: Code.fromAsset(path.join(__dirname, 'handler')),
      providerId,
      registerAccountWide: true,
    });
  }
}