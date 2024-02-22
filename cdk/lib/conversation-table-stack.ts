import { NestedStack, NestedStackProps, RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, ITable, StreamViewType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export interface ConversationTableStackProps extends NestedStackProps {}
class ConversationTableStack extends NestedStack {
  readonly Table: ITable;
  constructor(scope: Construct, id: string, props: ConversationTableStackProps) {
    super(scope, id, props);

    this.Table = new Table(this, 'ConversationTable', {
      tableName: 'ConversationTable',
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: { 
        name: 'Id',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'timestamp', 
        type: AttributeType.STRING
      },
      stream: StreamViewType.NEW_IMAGE,

    });
  }
}

export { ConversationTableStack };