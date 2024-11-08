// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as SecretManager from 'aws-cdk-lib/aws-secretsmanager';

interface PostContainerStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  repository: ecr.Repository;
  cluster: ecs.Cluster;
  application: string
  cidr: string;
  port: number;
  domain: string;
  bastionHostSecurityGroup: ec2.SecurityGroup;
}

export class PostContainerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PostContainerStackProps) {
    super(scope, id, props);

    const { vpc, repository, cluster, application, cidr, port, domain, bastionHostSecurityGroup } = props

    const redirectUri = `https://${application}.${domain}`


    /********************************************************************************
     * ECS TASK
    ********************************************************************************/
    //create taskRole
    const ecsTaskRole = new cdk.aws_iam.Role(this, 'ecsTaskRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    ecsTaskRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'));
    //create task execution role
    const ecsTaskExecutionRole = new cdk.aws_iam.Role(this, 'ecsTaskExecutionRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    // ecsTaskExecutionRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'));
    // ecsTaskExecutionRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'));
    // ecsTaskExecutionRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonElasticFileSystemReadOnlyAccess'));
    ecsTaskExecutionRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'));;

    //create task service security group
    const ecsServiceSecurityGroup = new cdk.aws_ec2.SecurityGroup(this, 'ecsServiceSecurityGroup', {
      vpc: vpc,
      allowAllOutbound: true,
    });
    // create ecs fargate taskdefinition
    const ecsTaskDefinition = new cdk.aws_ecs.FargateTaskDefinition(this, 'ecsTaskDefinition', {
      memoryLimitMiB: 1024,
      cpu: 256,
      family: `${application}-ecs-task`,
      taskRole: ecsTaskRole,
      executionRole: ecsTaskExecutionRole,
      runtimePlatform: {
        cpuArchitecture: cdk.aws_ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: cdk.aws_ecs.OperatingSystemFamily.LINUX
      },
    });
    const ecsTaskContainer = ecsTaskDefinition.addContainer('Task-Container', {
      image: cdk.aws_ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      portMappings: [{ containerPort: port }],
    })
    // create ecs fargate service
    const ecsService = new cdk.aws_ecs.FargateService(this, 'ecsService', {
      cluster: cluster,
      taskDefinition: ecsTaskDefinition,
      securityGroups: [ecsServiceSecurityGroup],
      assignPublicIp: false,
      desiredCount: 2,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    /********************************************************************************
     * ROUNTE53 & ALB
    ********************************************************************************/
    //create a targetgroup for ecs service
    const targetGroup = new cdk.aws_elasticloadbalancingv2.ApplicationTargetGroup(this, 'targetGroup', {
      targetType: cdk.aws_elasticloadbalancingv2.TargetType.IP,
      port: port,
      protocol: cdk.aws_elasticloadbalancingv2.ApplicationProtocol.HTTP,
      vpc: vpc,
    });
    targetGroup.addTarget(ecsService);
    //create applicationLoadBalancer securityGroup
    const applicationLoadBalancerSecurityGroup = new cdk.aws_ec2.SecurityGroup(this, 'applicationLoadBalancerSecurityGroup', {
      vpc: vpc,
      allowAllOutbound: true,
    });
    //create a internet facing ALB that has targetGroup as it starget
    const applicationLoadBalancer = new cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer(this, 'alb', {
      vpc: vpc,
      internetFacing: true,
      securityGroup: applicationLoadBalancerSecurityGroup,
    });
    
    
    // lookup my hosted zone by dns domain
    const hostedZone = cdk.aws_route53.HostedZone.fromLookup(this, 'hostedZone', { domainName: domain });
    //create a route53 alias record that points to alb
    const record = new cdk.aws_route53.ARecord(this, 'aliasRecord', {
      zone: hostedZone,
      recordName: `${application}.${domain}`,
      target: cdk.aws_route53.RecordTarget.fromAlias(new cdk.aws_route53_targets.LoadBalancerTarget(applicationLoadBalancer)),
    });
    //create a new certificate to be used on application load balanceer listener
    const certificate = new cdk.aws_certificatemanager.Certificate(this, 'certificate', {
      domainName: `${application}.${domain}`,
      validation: cdk.aws_certificatemanager.CertificateValidation.fromDns(cdk.aws_route53.HostedZone.fromHostedZoneId(this, 'hostedZoneId', hostedZone.hostedZoneId)),
    });
    // add a listener on port 443 to applicationLoadBalancer
    applicationLoadBalancer.addListener('listener443', {
      port: 443,
      open: true,
      certificates: [cdk.aws_certificatemanager.Certificate.fromCertificateArn(this, 'certificateArn', certificate.certificateArn),],
      defaultTargetGroups: [targetGroup],
      protocol: cdk.aws_elasticloadbalancingv2.ApplicationProtocol.HTTPS,
      sslPolicy: cdk.aws_elasticloadbalancingv2.SslPolicy.TLS13_EXT2
    });

    /********************************************************************************
     * COGNITO
    ********************************************************************************/
    //create a cognito user pool and return user pool id
    const userPool = new cognito.UserPool(this, `${application}-user-pool`, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    //create app client id
    const userPoolClient = new cognito.UserPoolClient(this, `${application}-user-pool-client`, {
      userPool: userPool,
      generateSecret: true,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.COGNITO_ADMIN],
        callbackUrls: [redirectUri],
        defaultRedirectUri: redirectUri,
      },
    });
    //create cognito domain
    const userPoolDomain = new cognito.UserPoolDomain(this, `${application}-user-pool-domain`, {
      userPool: userPool,
      cognitoDomain: {
        domainPrefix: `${application}-user-pool-domain`,
      },
    });
    //create identity pool to use with user pool
    const identityPool = new cognito.CfnIdentityPool(this, `${application}-identity-pool`, {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });

    //add ingress rule to allow access from alb
    ecsServiceSecurityGroup.addIngressRule(applicationLoadBalancerSecurityGroup, ec2.Port.tcp(port), 'allow from alb');

    //create a new secret in secrets manager
    const secret = new SecretManager.Secret(this, 'secret', {
      secretObjectValue: {
        POOL_ID: cdk.SecretValue.unsafePlainText(userPool.userPoolId),
        APP_CLIENT_ID: cdk.SecretValue.unsafePlainText(userPoolClient.userPoolClientId),
        APP_CLIENT_SECRET: userPoolClient.userPoolClientSecret,
      }
    });

    //add a new policy to ecstaskexecuterole to allow to read from secrets manager only from secret
    ecsTaskExecutionRole.addToPolicy(new cdk.aws_iam.PolicyStatement({
      resources: [secret.secretArn],
      actions: ['secretsmanager:GetSecretValue'],
    }));

    ecsTaskContainer.addSecret('POOL_ID', cdk.aws_ecs.Secret.fromSecretsManager(secret, 'POOL_ID'))
    ecsTaskContainer.addSecret('APP_CLIENT_ID', cdk.aws_ecs.Secret.fromSecretsManager(secret, 'APP_CLIENT_ID'))
    ecsTaskContainer.addSecret('APP_CLIENT_SECRET', cdk.aws_ecs.Secret.fromSecretsManager(secret, 'APP_CLIENT_SECRET'))

    // ecsTaskContainer.addEnvironment('POOL_ID', userPool.userPoolId)
    // ecsTaskContainer.addEnvironment('APP_CLIENT_ID', userPoolClient.userPoolClientId)
    // ecsTaskContainer.addEnvironment('APP_CLIENT_SECRET', userPoolClient.userPoolClientSecret.unsafeUnwrap())

  }
}