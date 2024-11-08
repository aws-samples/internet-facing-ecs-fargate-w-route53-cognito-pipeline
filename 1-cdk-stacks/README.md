# Welcome to your CDK TypeScript project

This is a CDK project for development with TypeScript.
It will allow to provision all the necessary resources to store, execute, publish to internet and authenticate a contanierized application (demo-app)

## Requirements

In order to use this CDK project you will need:

 - [ ] an AWS account (you need to have permission to provision new resources)
 - [ ] an authorized AWS CLI (needed for CDK to deploy the resources)
 - [ ] a Route53 Hosted Zone (you need to have permissions to add records to it)

## Provisioning
In order to use the project, from within a client that has AWS CLI configured to access the required AWS account:

### CDK Pre-Requisites
 1. clone the entire repository
 2. go to the folder you cloned the repository, then to the subfolder 1-cdk-stacks
 3. install all the required dependencies (e.g.: ***npm install***)
 4. bootstrap your account for CDK (***cdk bootstrap***)
 5. configure the static variables in the file bin/1-cdk-stacks.ts for application name, VPC CIDR, DNS domain, and application port number
 6. configure the two environment variables CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION with the AWS account number and in which region the resources should be provisioned.

### 1 Project Pre-Requisites

The first stack we need to deploy is ***PreContainerStack***, and It will create a:

 1. a VPC (with public and private subnets) with the conbfigured CIDR
 2. a bastion host that can be used to interact with the provisioned resources in a secure way (only allows connections using [AWS System Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-linux.html))
 3. a ECR reporitory (with the same name as the configured application name)
 4. a ECS cluster (with no task definition)

In order to deploy the stack, from the command line please:
 1. cd /*path*/*to*/*folder*/*you*/*cloned*/*the*/*code*/1-cdk-stacks
 2. cdk deploy PreContainerStack

### 2 Containerized Application

This activity is described in the folder [2-container](../2-container/README.md).
You can continue to the next step once done.

### 3 Project Finalize

The second and final stack we need to deploy is ***PostContainerStack***, and It will create a:

 1. ECS Task Definition (with hardware resources, and task and execution roles)
 2. ECS Task Container (with a reference to the Docker image)
 3. ECS Service (that defines which Task Definition runs on which cluster and how many instances are needed)
 4. a Target Group for the defined ECS service
 5. and ALB that exposes to public internet the Target Group
 6. an Alias Record in the Route53 Hosted Zone to resolve a new subdomain (specific for the application) to the ALB
 7. a Cognito UserPool
 8. a Cognito UserPool Client
 9. a Cognito IdentityPool to manage identities provided by the UserPool
 10. configure the environment variables required by the containerized application to authenticate and adds them to the Task Definition
  
In order to deploy the stack, from the command line please:
 1. cd /*path*/*to*/*folder*/*you*/*cloned*/*the*/*code*/1-cdk-stacks
 2. cdk deploy PostContainerStack