# Infrastructure

## Prerequisites

- AWS CLI configured (`aws configure`)
- AWS SAM CLI installed (`brew install aws-sam-cli` or `pip install aws-sam-cli`)
- Node.js 20+

## Deploy

### First time (guided):
```bash
pnpm deploy:guided
```

### Subsequent deploys:
```bash
pnpm deploy
```

### Validate template:
```bash
pnpm validate
```

## Resources Created

| Resource | Type | Purpose |
|----------|------|---------|
| ApiGateway | HTTP API | REST endpoints |
| IngestaFunction | Lambda | Clone repos, upload to S3 |
| AnalyzerFunction | Lambda | Run code analysis |
| ReportGeneratorFunction | Lambda | Generate audit reports |
| GetReportFunction | Lambda | Retrieve stored reports |
| CodeBucket | S3 | Temporary code storage (24h TTL) |
| ReportsBucket | S3 | Generated reports |
| ResultsTable | DynamoDB | Analysis results |

## Costs

All resources fit within AWS Free Tier:
- Lambda: 1M free invocations/month
- API Gateway: 1M free calls/month
- S3: 5GB storage free
- DynamoDB: 25GB + 25 RCU/WCU free

## Environment Variables

Set in the Lambda environment (via template.yaml Globals):
- `CODE_BUCKET` — S3 bucket for temporary code
- `REPORTS_BUCKET` — S3 bucket for reports
- `RESULTS_TABLE` — DynamoDB table name

## Frontend Deployment

The frontend is deployed separately via AWS Amplify:
1. Connect your GitHub repository to Amplify
2. Set the build directory to `packages/frontend/`
3. Build command: `pnpm build`
4. Output directory: `dist`
5. Set environment variable: `VITE_API_URL=<your API Gateway URL>`
