import { Construct } from 'constructs';
import { CustomState, DefinitionBody, StateMachine, JsonPath, IStateMachine, Pass, TaskInput, Map } from 'aws-cdk-lib/aws-stepfunctions';
import { BedrockInvokeModel } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NestedStack, NestedStackProps } from "aws-cdk-lib";
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IBucket } from 'aws-cdk-lib/aws-s3';

export interface StateMachineStackProps extends NestedStackProps {
  Table: ITable;
  Bucket: IBucket;
  modelArn: string;
}

class StateMachineStack extends NestedStack {
  readonly stateMachine: IStateMachine;
  constructor(scope: Construct, id: string, props: StateMachineStackProps) {
    super(scope, id, props);

    const defintion = new CustomState(this, 'Query Conversatuion', {
      stateJson: {
        Type: 'Task',
        Resource: "arn:aws:states:::aws-sdk:dynamodb:query",
        Parameters: {
          TableName: props.Table.tableName,
          Limit: 5,
          ScanIndexForward: true,
          KeyConditionExpression: `Id = :id`,
          ExpressionAttributeValues: {
            ":id": {
              "S.$": JsonPath.stringAt('$[0].Id')
            }
          }
        },
        ResultSelector: {
          'messages.$': '$.Items'
        },
        ResultPath: '$'
      }
    }).next(new CustomState(this, 'Recap Conversation', {
      stateJson: {
        Type: "Map",
        ItemsPath: "$.messages",
        Iterator: {
          StartAt: "Fetch Message",
          States: {
            "Fetch Message": {
              Type: "Pass",
              Parameters: {
                "result.$": "$.message.S"
              },
              OutputPath: "$.result",
              End: true
            }
          }
        },
        ResultPath: "$.messages"
      }
    })).next(new CustomState(this, 'Prompt Preparation', {
      stateJson: {
        Type: 'Task',
        Resource: "arn:aws:states:::aws-sdk:s3:getObject",
        Parameters: {
          Bucket: props.Bucket.bucketName,
          Key: "prompt.txt"
        },
        ResultSelector: {
          'body.$': '$.Body'
        },
        ResultPath: '$.prompt'
      }
    })).next(new Pass(this, 'Format Prompt', {
      parameters: {
        "output.$": "States.Format($.prompt.body, $.messages)"
      }
    })).next(new BedrockInvokeModel(this, 'Invoke Model With Prompt', {
      contentType: "application/json",
      model: {
        modelArn: props.modelArn,
      },
      body: TaskInput.fromObject(
        {
          inputText: JsonPath.stringAt('$.output'),
        },
      ),
    }));

    const stateMachine = new StateMachine(this, 'ConversationStateMachine', {
      stateMachineName: 'conversation-state-machine',
      definitionBody: DefinitionBody.fromChainable(defintion)
    });

    stateMachine.addToRolePolicy(
      new PolicyStatement({
        actions: ["s3:getObject"],
        resources: [`${props.Bucket.bucketArn}/*`],
      })
    );

    stateMachine.addToRolePolicy(
      new PolicyStatement({
        actions: ["Dynamodb:query"],
        resources: [  props.Table.tableArn ],
      })
    );

    stateMachine.addToRolePolicy(
      new PolicyStatement({
        actions: ["bedrock:invokeModel"],
        resources: [  props.modelArn ],
      })
    );

    this.stateMachine = stateMachine;
  }
}

export { StateMachineStack };
