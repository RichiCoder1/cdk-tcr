import { Construct } from 'constructs';
import { Duration, Tags } from "aws-cdk-lib/core";
import { Provider as CustomResourceProvider } from "aws-cdk-lib/custom-resources";
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Code, Function, FunctionProps, IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ResourceDefinition } from './resourceDefinition';

const PROVIDER_ID_REGEX = /^[a-zA-Z0-9-_]{1,54}$/;

type EventHandlerProps = Partial<FunctionProps> & { code: FunctionProps['code'] };

type TypedProviderPropsBase<ResourceDef extends ResourceDefinition<any>> = {
  resource: ResourceDef;
  onEvent: Code | EventHandlerProps | IFunction;
  isComplete?: Code | EventHandlerProps | IFunction;
};

type TypedProviderPropsAccountWide<ResourceDef extends ResourceDefinition<any>> = TypedProviderPropsBase<ResourceDef> & {
  registerAccountWide: true;
  providerId: string;
}

export type TypedProviderProps<ResourceDef extends ResourceDefinition<any>> = TypedProviderPropsAccountWide<ResourceDef> | TypedProviderPropsBase<ResourceDef>;

const FUNCTION_DEFAULTS = {
  runtime: Runtime.NODEJS_16_X,
  timeout: Duration.minutes(2),
  logRetention: RetentionDays.ONE_MONTH,
} satisfies Omit<FunctionProps, 'code' | 'handler'>;

/**
 * Creates and registers a Typed Custom Resource Provider.
 * To use this provider, you can use `getOrCreateProvider` to create a singleton provider for the given stack and return the service token.
 * 
 * If you'd like to create an account-wide provider instead of a stack singleton provider, you can use the `registerAccountWide` to enabled the SSM Parameter Store registration.
 * This will create a parameter in the SSM Parameter Store with the service token for the provider with a parameter name like `/cdk-tcr/providers/${providerId}`.
 * You can then pass the service token into a Custom Resource using ProviderRegistration.getServiceToken(scope, ProviderId);
 */
export class TypedProvider<ResourceDef extends ResourceDefinition<any> = ResourceDefinition<any>> extends Construct {
  public readonly onEventHandler: IFunction;
  public readonly isCompleteHandler?: IFunction;
  public readonly provider: CustomResourceProvider;
  constructor(scope: Construct, id: string, props: TypedProviderProps<ResourceDef>) {
    const { onEvent } = props;
    super(scope, id);

    let providerId: string | undefined;
    if ('registerAccountWide' in props && props.registerAccountWide === true) {
      if (!props.providerId) {
        throw new Error("providerId must be specified when registering account-wide");
      }

      providerId = props.providerId;
      if (!PROVIDER_ID_REGEX.test(providerId)) {
        throw new Error("providerId must only container alphanumeric, hyphen, or underscore characters and be less than 54 characters");
      }
    }

    Tags.of(this).add('cdk-tcr:typeName', props.resource.typeName);
    Tags.of(this).add('cdk-tcr:accountWide', `${'registerAccountWide' in props && props.registerAccountWide === true}`);
    if (providerId) {
      Tags.of(this).add('cdk-tcr:providerId', providerId);
    }

    const onEventName = providerId ? `${providerId}-onEvent` : undefined;
    const onEventEntrypoint = 'index.onEvent';
    const onEventDescription = `Custom Resource Provider Handler for ${providerId ?? props.resource.typeName}`;
    if (Construct.isConstruct(onEvent)) {
      this.onEventHandler = onEvent;
    } else if (props instanceof Code) {
      this.onEventHandler = new Function(this, `${id}OnEvent`, {
        functionName: onEventName,
        handler: onEventEntrypoint,
        description: onEventDescription,
        code: onEvent as Code,
        ...FUNCTION_DEFAULTS,
      });
    } else {
      const functionProps = props.onEvent as EventHandlerProps;
      this.onEventHandler = new Function(this, `${id}OnEvent`, {
        functionName: onEventName,
        handler: onEventEntrypoint,
        description: onEventDescription,
        ...FUNCTION_DEFAULTS,
        ...functionProps,
      });
    }

    if (props.isComplete) {
      const isCompleteName = providerId ? `${providerId}-isComplete` : undefined;
      const isCompleteEntrypoint = 'index.isComplete';
      const isCompleteDescription = `Custom Resource Provider Completion Polling Handler for ${providerId ?? props.resource.typeName}`;
      if (Construct.isConstruct(props.isComplete)) {
        this.isCompleteHandler = props.isComplete;
      } else if (props instanceof Code) {
        this.onEventHandler = new Function(this, `${id}OnEvent`, {
          functionName: isCompleteName,
          handler: isCompleteEntrypoint,
          description: isCompleteDescription,
          code: onEvent as Code,
          ...FUNCTION_DEFAULTS,
        });
      }  else {
        const functionProps = props.isComplete as EventHandlerProps;
        this.isCompleteHandler = new Function(this, `${id}IsComplete`, {
          functionName: isCompleteName,
          handler: isCompleteEntrypoint,
          description: isCompleteDescription,
          ...FUNCTION_DEFAULTS,
          ...functionProps,
        });
      }
    }

    this.provider = new CustomResourceProvider(this, `${id}Provider`, {
      providerFunctionName: `${providerId}-framework`,
      onEventHandler: this.onEventHandler,
      logRetention: RetentionDays.ONE_MONTH,
    });

    if ('registerAccountWide' in props && props.registerAccountWide === true) {
      new ProviderRegistration(this, `${id}ProviderRegistration`, {
        provider: this.provider,
        providerId: providerId!,
      });
    }
  }

  public get serviceToken() {
    return this.provider.serviceToken;
  }
}

export interface ProviderRegistrationProps {
  readonly provider: CustomResourceProvider;
  readonly providerId: string;
  readonly parameterPrefix?: string;
}

export class ProviderRegistration extends Construct {
  readonly parameter: StringParameter;
  constructor(scope: Construct, id: string, props: ProviderRegistrationProps) {
    super(scope, id);

    const { provider, parameterPrefix, providerId } = props;

    let prefix = parameterPrefix ?? "/cdk-tcr/providers";
    if (prefix.endsWith("/")) {
      prefix = prefix.slice(0, -1);
    }

    this.parameter = new StringParameter(this, `${provider.node.id}Parameter`, {
      parameterName: `${prefix}/${providerId}`,
      stringValue: provider.serviceToken,
    });
  }
}