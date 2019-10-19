import AWS from "aws-sdk";
import s3 from "aws-sdk/clients/s3";
import DynamoDB from "aws-sdk/clients/dynamodb";

export default class ExternalServices {
  sendSubscriptionRequest(
    playerTopicArn,
    playerTwitchId,
    playerUsername,
    protocol,
    endpoint
  ) {
    return fetch(
      "https://sebb5pvixl.execute-api.us-east-1.amazonaws.com/dev/subscription/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          PlayerTopicArn: playerTopicArn,
          PlayerTwitchId: playerTwitchId,
          Player: playerUsername,
          Protocol: protocol,
          Endpoint: endpoint
        })
      }
    );
  }

  getPlayerFeedInfo(playerTwitchId) {
    console.log("playerTwitchId:", playerTwitchId);
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

    const dynamoClient = new DynamoDB({
      endpoint: "https://dynamodb.us-east-1.amazonaws.com",
      accessKeyId: ".",
      secretAccessKey: ".",
      region: "us-east-1"
    });

    return dynamoClient.query(params).promise();
  }
}
