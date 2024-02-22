#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ConversationStack } from '../lib/conversation-stack';

const app = new cdk.App();
new ConversationStack(app, ConversationStack.name, {
  tags: {
    application: 'conversation-fraud-detection'
  }
})
  .withConversationTable()
  .withPromptBucket()
  .withApi()
  .withStateMachine()
  .withConversationTableEventBridgePipe();