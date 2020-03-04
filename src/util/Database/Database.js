import DynamoDB from 'aws-sdk/clients/dynamodb';

export default class Database {
  constructor() {
    this.dynamoClient = new DynamoDB.DocumentClient({
      endpoint: 'https://dynamodb.us-east-1.amazonaws.com',
      accessKeyId: 'AKIAYGOXM6CJTCGJ5S5Z',
      secretAccessKey: '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',
      region: 'us-east-1'
    });
  }

  getUserRecordsByTwitchId(twitchId) {
    const params = {
      TableName: 'Main',
      IndexName: 'TwitchIdIndex',
      KeyConditionExpression: 'TwitchId = :TwitchId',
      ExpressionAttributeValues: {
        ':TwitchId': twitchId
      }
    };

    console.log('params:', params);
    return this.dynamoClient.query(params).promise();
  }

  getFeedCategories(producer) {
    const params = {
      TableName: 'Main',
      KeyConditionExpression: 'PRT = :PRT AND begins_with(SRT, :SRT)',
      ExpressionAttributeValues: {
        ':PRT': producer,
        ':SRT': 'F|CAT'
      }
    };

    return this.dynamoClient.query(params).promise();
  }

  saveNewPushSubscription(producer, stringifiedSubscription, filter = null) {
    const params = {
      TableName: 'Main',
      Item: {
        PRT: `${producer}|PUSH`,
        SRT: `F|SUB|${stringifiedSubscription}`,
        G1S: producer,
        Filter: filter
      }
    };

    return this.dynamoClient.put(params).promise();
  }
}
