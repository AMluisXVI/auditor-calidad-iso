import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateHandler, getReportHandler } from '../src/index.js';
import type { APIGatewayProxyEvent } from 'aws-lambda';

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    resource: '',
    ...overrides,
  };
}

describe('generateHandler', () => {
  it('returns 400 when requestId is missing', async () => {
    const event = makeEvent({ body: '{}' });
    const result = await generateHandler(event);

    assert.equal(result.statusCode, 400);
    const body = JSON.parse(result.body);
    assert.equal(body.error, 'requestId is required');
  });

  it('returns 400 when body is empty', async () => {
    const event = makeEvent({ body: '' });
    const result = await generateHandler(event);

    assert.equal(result.statusCode, 400);
    const body = JSON.parse(result.body);
    assert.equal(body.error, 'requestId is required');
  });

  it('returns 400 when body is null', async () => {
    const event = makeEvent({ body: null });
    const result = await generateHandler(event);

    assert.equal(result.statusCode, 400);
    const body = JSON.parse(result.body);
    assert.equal(body.error, 'requestId is required');
  });
});

describe('getReportHandler', () => {
  it('returns 400 when report ID is missing from path params', async () => {
    const event = makeEvent({
      httpMethod: 'GET',
      pathParameters: null,
    });
    const result = await getReportHandler(event);

    assert.equal(result.statusCode, 400);
    const body = JSON.parse(result.body);
    assert.equal(body.error, 'Report ID is required');
  });

  it('returns 400 when id path parameter is empty', async () => {
    const event = makeEvent({
      httpMethod: 'GET',
      pathParameters: { id: '' },
    });
    const result = await getReportHandler(event);

    assert.equal(result.statusCode, 400);
    const body = JSON.parse(result.body);
    assert.equal(body.error, 'Report ID is required');
  });
});

describe('response format', () => {
  it('generateHandler sets Content-Type to application/json', async () => {
    const event = makeEvent({ body: '{}' });
    const result = await generateHandler(event);

    assert.equal(result.headers?.['Content-Type'], 'application/json');
  });

  it('getReportHandler sets Content-Type to application/json on error', async () => {
    const event = makeEvent({
      httpMethod: 'GET',
      pathParameters: null,
    });
    const result = await getReportHandler(event);

    assert.equal(result.headers?.['Content-Type'], 'application/json');
  });
});
