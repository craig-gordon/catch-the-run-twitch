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

  getPushSubscription(viewerId, producer) {
    const params = {
      TableName: 'Main',
      Key: {
        PRT: `${producer}|P`,
        SRT: `F|SUB|${viewerId}`
      }
    };

    return this.dynamoClient.get(params).promise();
  }

  addPushSubscription(viewerId, producer, includedGames, includedCategories, stringifiedSubscription) {
    const gamesSet = this.dynamoClient.createSet(includedGames);
    const categoriesSet = this.dynamoClient.createSet(includedCategories);

    const params = {
      TableName: 'Main',
      Item: {
        PRT: `${producer}|P`,
        SRT: `F|SUB|${viewerId}`,
        GS: producer,
        IncludedGames: gamesSet,
        IncludedCategories: categoriesSet,
        Endpoint: stringifiedSubscription
      }
    };

    return this.dynamoClient.put(params).promise();
  }

  async updatePushSubscription(viewerId, producer, includedGames, includedCategories) {
    const getParams = {
      TableName: 'Main',
      Key: {
        PRT: `${producer}|P`,
        SRT: `F|SUB|${viewerId}`
      }
    };

    const sub = (await this.dynamoClient.get(getParams).promise()).Item;

    sub.IncludedGames = this.dynamoClient.createSet(includedGames);
    sub.IncludedCategories = this.dynamoClient.createSet(includedCategories);

    const putParams = {
      TableName: 'Main',
      Item: sub
    };

    return this.dynamoClient.put(putParams).promise();
  }

  deletePushSubscription(viewerId, producer) {
    const params = {
      TableName: 'Main',
      Key: {
        PRT: `${producer}|P`,
        SRT: `F|SUB|${viewerId}`
      }
    };

    return this.dynamoClient.delete(params).promise();
  }
}
