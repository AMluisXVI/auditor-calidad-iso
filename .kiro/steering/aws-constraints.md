# AWS Constraints

## Free Tier Only
This project MUST operate entirely within AWS Free Tier limits. No paid services or resources that exceed free tier quotas.

## Lambda Limits
- Maximum execution time: 15 minutes (900 seconds)
- Maximum memory: 512 MB
- Runtime: Node.js 20.x
- Deploy with AWS SAM

## Prohibited Services
- No generative AI services (Bedrock, SageMaker, etc.)
- No services outside free tier bounds

## Storage
- S3: Use lifecycle rules to delete temporary code uploads after 24 hours
- DynamoDB: Stay within 25 GB storage and 25 WCU/RCU free tier limits

## Networking
- Use API Gateway for HTTP endpoints (REST API free tier: 1M calls/month)
- No VPC unless strictly required (avoid NAT Gateway costs)
