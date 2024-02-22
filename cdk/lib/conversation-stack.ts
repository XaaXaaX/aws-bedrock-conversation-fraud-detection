import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiStack } from './api-stack';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnPipe } from 'aws-cdk-lib/aws-pipes';
import { StateMachineStack } from './state-machine-stack';
import { PromptBucketStack } from './prompt-bucket-stack';
import { ConversationTableStack } from './conversation-table-stack';

class ConversationStack extends Stack {
  private conversationTable: ConversationTableStack;
  private promptBucket: PromptBucketStack;
  private api: ApiStack;
  private stateMachineStack: StateMachineStack;
  private readonly modelArn: string;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const { region: REGION, account: ACCOUNT } = Stack.of(this);
    this.modelArn = Stack.of(this).formatArn({
      service: 'bedrock',
      resource: 'foundation-model',
      resourceName: 'amazon.titan-text-lite-v1',
      region: REGION,
      account: '',
    });
  }

  withConversationTable() : Pick<ConversationStack, 'withPromptBucket'> {
    this.conversationTable = new ConversationTableStack(this, 'ConversationTable', {});
    return this;
  }
  withPromptBucket(): Pick<ConversationStack, 'withApi'>{
    this.promptBucket = new PromptBucketStack(this, 'PromptBucketStack', {});
    return this;
  }
  withApi(): Pick<ConversationStack, 'withStateMachine'> {
    this.api = new ApiStack(this, 'ConversationApiStack', {
      conversationTable: this.conversationTable.Table,
    });
    return this;
  }

  withStateMachine(): Pick<ConversationStack, 'withConversationTableEventBridgePipe'> {
    this.stateMachineStack = new StateMachineStack(this, 'ConversationStateMachineStack', {
      Table: this.conversationTable.Table,
      Bucket: this.promptBucket.Bucket,
      modelArn: this.modelArn,
    });

    return this;
  }

  withConversationTableEventBridgePipe(): Omit<ConversationStack, ''> {
    const pipeRole = new Role(this, 'ConversationTablePipeRole', {
      assumedBy: new ServicePrincipal('pipes.amazonaws.com'),
    });

    new CfnPipe(this, 'ConversationTablePipe', {
      roleArn: pipeRole.roleArn,
      source: this.conversationTable.Table.tableStreamArn!,
      sourceParameters: {
        dynamoDbStreamParameters: {
          startingPosition: 'LATEST',
        },
        filterCriteria: {
          filters: [{
            pattern: `{ 
              "eventName": [ "INSERT" ] 
            }`}]
        }
      },
      target: this.stateMachineStack.stateMachine.stateMachineArn,
      targetParameters: {
        stepFunctionStateMachineParameters: {
          invocationType: 'FIRE_AND_FORGET',
        },
        inputTemplate: `
          {
            "Id": <$.dynamodb.NewImage.Id.S>, 
            "message": <$.dynamodb.NewImage.message.S>,
            "timestamp": <$.dynamodb.NewImage.timestamp.S>
          }`
      }
    });

    this.stateMachineStack.stateMachine.grantStartExecution(pipeRole);
    this.conversationTable.Table.grantStreamRead(pipeRole);

    return this;
  }
  
}

export { ConversationStack };