// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { readFileSync } from 'fs';
import * as ecr from "aws-cdk-lib/aws-ecr";


interface PreContainerStackProps extends cdk.StackProps {
  application: string
  cidr: string;
}

export class PreContainerStack extends cdk.Stack {

  public readonly vpc: ec2.IVpc;
  public readonly repository: ecr.Repository;
  public readonly cluster: cdk.aws_ecs.Cluster;
  public readonly bastionHostSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: PreContainerStackProps) {
    super(scope, id, props);

        // Get the cidr from vpc stack
        const { application, cidr } = props;

        // VPC & SUBNETS
        const vpc = new ec2.Vpc(this, `${application}-vpc`, {
          ipAddresses: ec2.IpAddresses.cidr(cidr),
          natGateways: 1,
          maxAzs: 2,
          subnetConfiguration: [
            {
              name: `${application}-public`,
              subnetType: ec2.SubnetType.PUBLIC,
              cidrMask: 28,
            },
            {
              name: `${application}-private`,
              subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
              cidrMask: 28,
            },
          ]
        });
        this .vpc = vpc

        // ECS CLUSTER
        const ecsCluster = new cdk.aws_ecs.Cluster(this, 'ecsCluster', {
          vpc: vpc,
          containerInsights: true,
        });
        this.cluster = ecsCluster
    
        // ECR REPO
        const repo = new ecr.Repository(this, "ecr-repo", {
          repositoryName: application,
          imageScanOnPush: true,
          encryption: ecr.RepositoryEncryption.AES_256,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        this.repository = repo
  }
}
