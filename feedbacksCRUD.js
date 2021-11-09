const AWS = require('aws-sdk');
AWS.config.update({
    region: 'ap-southeast-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = 'TB_FEEDBACKS';
const feedbacksPath = '/feedbacks';
const feedbackPath = '/feedback';

exports.handler = async function (event) {
    console.log('Request event: ', event);
    let response;
    switch (true) {
        case event.httpMethod === 'GET' && event.path === feedbackPath:
            response = await getFeedback(event.queryStringParameters.FEEDBACKS_ID);
            break;
        case event.httpMethod === 'GET' && event.path === feedbacksPath:
            response = await getFeedbacks();
            break;
        case event.httpMethod === 'POST' && event.path === feedbackPath:
            response = await saveFeedback(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PUT' && event.path === feedbackPath:
            response = await updateFeedback(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PATCH' && event.path === feedbackPath:
            const requestBody = JSON.parse(event.body);
            response = await modifyFeedback(requestBody.FEEDBACKS_ID);
            break;
        case event.httpMethod === 'DELETE' && event.path === feedbackPath:
            response = await deleteFeedback(JSON.parse(event.body).FEEDBACKS_ID);
            break;
        default:
            response = buildResponse(404, '404 Not Found');
    }
    return response;
}

async function getFeedback(FEEDBACKS_ID) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'FEEDBACKS_ID': FEEDBACKS_ID
        }
    }
    return await dynamodb.get(params).promise().then((response) => {
        return buildResponse(200, response.Item);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    });
}

async function getFeedbacks() {
    const params = {
        TableName: dynamodbTableName
    }
    const allFeedbacks = await scanDynamoRecords(params, []);
    const body = {
        feedbacks: allFeedbacks
    }
    return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
    try {
        const dynamoData = await dynamodb.scan(scanParams).promise();
        itemArray = itemArray.concat(dynamoData.Items);
        if (dynamoData.LastEvaluatedKey) {
            scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
            return await scanDynamoRecords(scanParams, itemArray);
        }
        return itemArray;
    } catch (error) {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    }
}

async function saveFeedback(requestBody) {
    const params = {
        TableName: dynamodbTableName,
        Item: requestBody
    }
    return await dynamodb.put(params).promise().then(() => {
        const body = {
            Operation: 'SAVE',
            Message: 'Feedback has been successfully saved.',
            Item: requestBody
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function updateFeedback(requestBody) {
    const params = {
        TableName: dynamodbTableName,
        Item: requestBody
    }
    return await dynamodb.put(params).promise().then(() => {
        const body = {
            Operation: 'UPDATE',
            Message: 'Feedback has been successfully updated.',
            Item: requestBody
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function modifyFeedback(FEEDBACKS_ID, updateKey, updateValue) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'FEEDBACKS_ID': FEEDBACKS_ID
        },
        UpdateExpression: `set ${updateKey} = :value`,
        ExpressionAttributeValues: {
            ':value': updateValue
        },
        ReturnValues: 'UPDATED_NEW'
    }
    return await dynamodb.update(params).promise().then((response) => {
        const body = {
            Operation: 'UPDATE',
            Message: 'Feedback updated successfully.',
            UpdatedAttributes: response
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

async function deleteFeedback(FEEDBACKS_ID) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'FEEDBACKS_ID': FEEDBACKS_ID
        },
        ReturnValues: 'ALL_OLD'
    }
    return await dynamodb.delete(params).promise().then((response) => {
        const body = {
            Operation: 'DELETE',
            Message: 'Feedback has been successfully deleted.',
            Item: response
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error('Do your custom error handling here. I am just gonna log it: ', error);
    })
}

function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Headers": "Access-Control-Allow-Origin",
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(body)
    }
}