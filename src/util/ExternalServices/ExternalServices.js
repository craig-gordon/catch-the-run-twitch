import AWS from "aws-sdk";
import s3 from "aws-sdk/clients/s3";
import DynamoDB from "aws-sdk/clients/dynamodb";

export default class ExternalServices {
  sendSubscriptionRequest(player, protocol, endpoint) {
    return new Promise((resolve, reject) => {
      fetch(
        "https://sebb5pvixl.execute-api.us-east-1.amazonaws.com/dev/subscription/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            Player: player,
            Protocol: protocol,
            Endpoint: endpoint
          })
        }
      )
        .then(response => resolve(response))
        .catch(e => {
          console.log("error:", e);
          reject(e);
        });
    });
  }

  getPlayerInfo(player) {
    const params = {
      TableName: "Main",
      KeyConditionExpression:
        "#Partition = :Partition AND begins_with(#Sort, :Sort)",
      ExpressionAttributeNames: {
        "#Partition": "Partition",
        "#Sort": "Sort"
      },
      ExpressionAttributeValues: {
        ":Partition": {
          S: player
        },
        ":Sort": {
          S: "FEED"
        }
      }
    };

    const dynamoClient = new DynamoDB({
      endpoint: "https://dynamodb.us-east-1.amazonaws.com",
      accessKeyId: ".",
      secretAccessKey: ".",
      region: "."
    });

    dynamoClient
      .query(params)
      .promise()
      .then(data => {
        console.log("Player data:", data);
      })
      .catch(err => {
        console.log("Error fetching Player data:", err);
      });
  }
}
