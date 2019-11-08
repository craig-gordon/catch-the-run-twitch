import DynamoDB from "aws-sdk/clients/dynamodb";

export default class Database {
  dynamoClient = new DynamoDB.DocumentClient({
    endpoint: "https://dynamodb.us-east-1.amazonaws.com",
    accessKeyId: "AKIAYGOXM6CJTCGJ5S5Z",
    secretAccessKey: "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",
    region: "us-east-1"
  });

  async getFeedCategories(playerTwitchUsername) {
    const params = {
      TableName: "Main",
      KeyConditionExpression: "PRT = :PRT AND begins_with(SRT, :SRT)",
      ExpressionAttributeValues: {
        ":PRT": {
          S: playerTwitchUsername
        },
        ":SRT": {
          S: "F|CAT"
        }
      }
    };

    try {
      return (await this.dynamoClient.query(params).promise()).Items;
    } catch (e) {
      console.log('error getting player feed info:', e);
    }
  }

  async saveNewPushSubscription(playerTwitchUsername, stringifiedSubscription) {
    const params = {
      TableName: 'Main',
      Item: {
        PRT: `${playerTwitchUsername}|PUSH`,
        SRT: `F|SUB|${stringifiedSubscription}`,
        G1S: playerTwitchUsername,
        Filter: window.subscriptionDetails.Filter
      }
    };

    try {
      return await this.dynamoClient.put(params).promise();
    } catch (e) {
      console.log('error saving new push subscription:', e);
    }
  }
}
