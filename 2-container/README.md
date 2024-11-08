
# Containerized Application

This repository contains an example of a containerized application, and how to create a [Docker](https://www.docker.com/) image and push it to ECR.

The demo-app integrates with Cognito to force user authentication, as an example on how to protect your web applications.

## The Code
To keep it as simple as possible it uses [Streamlit](https://streamlit.io/), an open-source Pyhton framework for application development.
It also integrates with Cognito to authenticate for users.

```
import  os
import streamlit as  st
from streamlit_cognito_auth import CognitoAuthenticator
```

The source code will require some specific Cognito parameters that will be provided as *environment variables* in the task definition in ***1-cdk-stacks***.

In the *src* folder theres is also a *requirements.txt* file used to install all the dependencies.

The file *Dockerfile* is ready for you to create the docker image of the demo application.

## Push image to ECR

To create your docker image, run the command

```
docker build -t demo-app .
```

To authenticate to the ECR repository, run the command

```
aws ecr get-login-password --region eu-west-2 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.xx-xx-x.amazonaws.com
```

To tag your docker image with ECR repo details, run the command

```
docker tag demo-app:latest 123456789012.dkr.ecr.xx-xx-x.amazonaws.com/demo-app:latest
```

where in ***123456789012.dkr.ecr.xx-xx-x.amazonaws.com***, the number ***123456789012*** is your AWS account and the string ***xx-xx-xx*** is your selected region.

To push your image to ECR repo, run the command

```
docker push 123456789012.dkr.ecr.xx-xx-x.amazonaws.com/demo-app:latest
```

