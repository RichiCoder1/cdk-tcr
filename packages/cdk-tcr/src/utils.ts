import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { CustomResourceProvider, Stack } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import type { ProviderRegistrationProps, TypedProvider } from './provider';

export function getOrCreateProvider(scope: Construct, constructor: new (scope: Construct, id: string) => { readonly serviceToken: string }): string {
  const stack = Stack.of(scope);
  const id = `CrProvider${constructor.name}`;
  const provider = stack.node.tryFindChild(id) as CustomResourceProvider | TypedProvider ?? new constructor(stack, id);
  return provider.serviceToken;
}

export function getRegisteredServiceToken(scope: Construct, props: Omit<ProviderRegistrationProps, 'provider'> | string) {
  let parameter : string;
  if (typeof props === 'string') {
    parameter  = `/cdk-tcr/providers/${props}`;
  } else  {
    const { parameterPrefix, providerId } = props;
    let prefix = parameterPrefix ?? "/cdk-tcr/providers";
    if (prefix.endsWith("/")) {
      prefix = prefix.slice(0, -1);
    }
    parameter = `${prefix}/${providerId}`;
  }
  return StringParameter.valueForStringParameter(scope, parameter);
}