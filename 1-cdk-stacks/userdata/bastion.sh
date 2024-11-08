#!/bin/bash

sudo su
yum update -y

sudo yum install -y jq

sudo yum remove aws-cli

curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install