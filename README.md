# Intro

This project simulates a call center web site where people leave a message for CSRs
to process later.  It uses Google's services, Netlify, and Astra Database.

## Using the app

The application is up and running at
[https://call-center-605a88.netlify.app/login](https://call-center-605a88.netlify.app/login)

The app works best on Chrome, and you need to give browser permissions for recording and location when prompted (for full effect).

Click login and use the following credentials:

- demo@datstax.com / demo
- demo1@datstax.com / demo
- demo2@datstax.com / demo
- demo3@datstax.com / demo

Press Start Recording and then start speaking, and press Stop Recording when finished.  Watch as your call is processed (it will take 1-2 mins).  Once you see status gcp-complete, you can click on the dashboard and click on the map to find your call and transcription.

## High Level Architecture

![Architecture Overview](./netlify-client/src/assets/images/CompletedTranscribingAndSentiementAnalysis.png)

### Web Server

The UI client is written in Angular and runs on netlify.  It

a) calls an API server to login the user, upload a recording, get a recording's status, and present the dashboard, and

b) has a **netlify function that
invokes Stargate's REST API** to get a list of the most recent calls.

Try it out - [https://call-center-605a88.netlify.app/login](https://call-center-605a88.netlify.app/login)

Login using either:

- demo@datastax.com / demo
- demo1@datastax.com / demo
- demo2@datastax.com / demo
- demo3@datastax.com / demo

After you are logged in, click on the ```Upload a File``` link at the top of
the page and you can record a voice message. Your browser may prompt you to
give permission to use the microphone.

After you record your voice message clic on the ```Dashboard``` link at the
top of the page to see a map that shows where all of the messages came from.

### Microservices

All of the microservices run using Google Cloud Functions. There are only 2
microservices running:

- Login
- Files

You can find the code for these microservices in the ```api-server/google/```
folder.

## Installation

You will need the following components

1. Netlify account
1. This github repository
1. Astra DB in cloud provider / region of choice (our demo currently uses Google)
1. Credentials to a GCP service account, and a created cloud storage bucket.

### Install nvm locally

```nvm``` is the Node Version Manager tool. The instructions for installing and using nvm are available at [https://github.com/nvm-sh/nvm#installing-and-updating](https://github.com/nvm-sh/nvm#installing-and-updating). You can use the commnd ```nvm ls-remote```to see all of the version of node that you can install. At the time of thi writing, the most recent version was 16.11.1 which I installed with the following command:

```sh
nvm install 16.11.1
```

### Create the Astra Database

1. Create your Astra database. In this example we named the database ```call_center``` and created a keyspace in it named ```callcenter```
1. Copy and paste the CREATE TABLE and CREATE CUSTOM INDEX commands from the ```database/data_model.cql``` file into the cqlsh of your Astra database.
1. In the Astra web UI, click on the down-arrow next to your organization name, and then click on ```Oraganization Settings``` in the dropdown menu. ![Orgaization Settings](./images/organization_settings.png)
1. Create a custom role named ```call_center_admin``` and grant it all privileges, but restrict them to the call_center database.
![Create the call_center_admin custom role](./images/custom_role_1.png) ![Restrict to one database](./images/custom_role_2.png)
1. Still in the settings for your organization, click on the ```Token Management``` link. ![Launch Token Management](./images/token_mgt_1.png)
1. Select the custom role you just created and press the ```Generate Token``` button. ![Generate Token](./images/token_mgt_2.png)
1. I suggest you download the CSV file that contains your token information. Keep it in a safeplace for future reference. ![Download Token](./images/token_mgt_3.png)

### Configure Your Netlify Account

1. Clone a copy of the GitHub project at [GitHub](https://github.com/jdavies/call-center-app-v3)
1. Create a GitHub project on your github account for the call-center-app-v3 project and check in all of the project's code. Netlify will need to use your github account.
1. Connect Netlify to your github ```call-center-app-v3``` project.
1. In the Environment settings for your application in Netlify, define environment variables. ![Netlify Environment Variables](./images/netlify_environment_vars.png)
1. Next configure your build options in Netlify. [Build Settings](./images/netlify_build_settings.png)

### Configure Your Google Account

If you don't have a Google account already you can sign up for one for free at google.com. You will want to enable the APIs for:

- Cloud Functions
- Cloud Storage
- Natural Language - specifically we use the Cloud Natural Language API

To upload the login/ and files functions, go into the ```login/``` and
```files/``` folders and run the ```build.sh``` scripts in each folder.
The script will first try to run the ```setenv.sh``` script in the
```database/``` folder. If you dont have the ```setenv.sh``` script
defined there, simply create one with the following format:

```sh
export ASTRA_DB_ID=<YUR DATABASE ID>
export ASTRA_DB_TOKEN=<YOUR ASTRA DATABASE TOKEN>
export KEYSPACE=callcenter
export ASTRA_DB_REGION=us-west1
export ASTRA_CLIENT_ID=<YOUR ASTRA CLIENT ID>
export ASTRA_CLIENT_SECRET=<YOUR ASTRA CLIENT_SECRET>
export JWT_SECRET=<YOUR SECRET FOR GENERATING JWT>
```

Don't include the angle brackets in your export statements!
