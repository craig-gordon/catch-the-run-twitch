import DynamoDB from "aws-sdk/clients/dynamodb";

export default class ExternalServices {
  sendSubscriptionRequest(
    PlayerTwitchId,
    PlayerUsername,
    Protocol,
    Endpoint,
    FilterPolicy = null
  ) {
    return fetch(
      "https://sebb5pvixl.execute-api.us-east-1.amazonaws.com/dev/subscription/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          PlayerTwitchId,
          PlayerUsername,
          Protocol,
          Endpoint,
          FilterPolicy
        })
      }
    );
  }

  getPlayerFeedInfo(playerTwitchId) {
    const dynamoClient = new DynamoDB({
      endpoint: "https://dynamodb.us-east-1.amazonaws.com",
      accessKeyId: "AKIAYGOXM6CJTCGJ5S5Z",
      secretAccessKey: "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",
      region: "us-east-1"
    });

    const params = {
      TableName: "Main",
      KeyConditionExpression: "PRT = :PRT AND begins_with(SRT, :SRT)",
      ExpressionAttributeValues: {
        ":PRT": {
          S: playerTwitchId
        },
        ":SRT": {
          S: "F|CTG"
        }
      }
    };

    return dynamoClient.query(params).promise();
  }
}
