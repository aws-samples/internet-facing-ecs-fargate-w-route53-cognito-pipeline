
# Welcome to public-fargate-w-dns-cognito-alb-pipelines

The purpose of this repository is to provide you with the artefacts you will need to deploy any contanerized web application, make it publicly available (with DNS name resolution), and protect it with authentication with username and password.


## Structure

The two folders are to store all the artefacts and guidelines for you in order to: provision the required infrastructure, push a contanerized application to [Amazon Elastic Container Registry](https://aws.amazon.com/ecr/) (ECR).


### Infrastructure as Code

The folder **1-cdk-stacks** contains the required IaC and uses [AWS Cloud Development Kit](https://aws.amazon.com/cdk/) (CDK) in order to create everything needed for your web application to run in AWS.

- VPC & Subnets
- a Bastion Host with secured access
- ECR repo (to store the containerized application)
- ECS cluster (to run the containerized applications)
- [ECS task definition](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html) (runtime configuration for the containerized application)
- [Application Load Balancer](https://aws.amazon.com/elasticloadbalancing/application-load-balancer/) (ALB)
- [Amazon Cognito](https://aws.amazon.com/pm/cognito) for user authentication

### Containerized Application

The folder **2-container** containes an example of a containerized application where you can find:

- Source code of the application
- Integration with Cognito via source code
- Dockerfile to create container image

## Contributing
If you wish to contribute, please read [CONTRIBUTING](./CONTRIBUTING.md).


## Licensing
This sample code is made available under the MIT-0 license. See [LICENSE](./LICENSE.md).