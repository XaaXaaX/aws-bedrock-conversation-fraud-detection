import { NestedStack, NestedStackProps, RemovalPolicy } from "aws-cdk-lib";
import { Bucket, IBucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export interface PromptBucketStackProps extends NestedStackProps {}
class PromptBucketStack extends NestedStack {
  readonly Bucket: IBucket;
  constructor(scope: Construct, id: string, props?: PromptBucketStackProps) {
    super(scope, id, props);

    this.Bucket = new Bucket(this, 'PromptBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new BucketDeployment(this, 'DeployPrompt', {
      sources: [
        Source.asset('../src/prompts')
      ],
      destinationBucket: this.Bucket,
    });
  }
}

export { PromptBucketStack };