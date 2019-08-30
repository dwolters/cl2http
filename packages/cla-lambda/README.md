# cla-lambda

This package provides the code required to deploy the `cla` adapter as an `AWS Lambda` function. Visit the [root README](../../README.md) for more information about the project.

## Used AWS Resources

The *AWS Lambda* deployment makes use of the following AWS resources:

- *AWS Lambda* (to execute the adapter code)
- *AWS ApiGateway* (to provide the HTTP endpoints)
- *AWS S3* (to store the adapter code)
- *AWS CloudFormation* (to manage the deployment of the code)

**Note that the AWS deployment is only free of charge as long as you do not exceed the free tier limits of the used AWS services!**

## Development

### Prerequisites

- `npm install`
- [SAM Local](https://docs.aws.amazon.com/lambda/latest/dg/sam-cli-requirements.html)

Additionally for deployment:

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/installing.html)
- [add AWS credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html) (tested via `aws configure` with region name `eu-central-1` and output format `json`)
- create S3 bucket via `aws s3 mb s3://cli-adapter`

## Test
Test function via SAM: `npm test`

### Packaging
- within `/src/cla-lambda` run
```
sam package --template-file template.yaml --s3-bucket cli-adapter --output-template-file packaged.yaml
```
