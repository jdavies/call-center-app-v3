# Login

Before running these scripts, but sure to set your environment variables for:

- ASTRA_DB_ID
- ASTRA_DB_TOKEN
- KEYSPACE

I have then defined in the ```setenv.sh``` file in my ```database/``` directory in the project.

```sh
source ../../../database/setenv.sh
```

To test the login function, use the following payload on the body of the login function:

```json
{
    "username": "demo@datastax.com",
    "password": "demo"
}
```

Deploy the function to the cloud:

```sh
gcloud functions deploy login --runtime=nodejs14 --trigger-http \
  --region=us-west2 --allow-unauthenticated --memory=128MB \
  --set-env-vars ASTRA_DB_ID=$ASTRA_DB_ID \
  --set-env-vars ASTRA_DB_TOKEN=$ASTRA_DB_TOKEN \
  --set-env-vars KEYSPACE=$KEYSPACE \
  --set-env-vars ASTRA_DB_REGION=$ASTRA_DB_REGION \
  --set-env-vars ASTRA_CLIENT_ID=$ASTRA_CLIENT_ID \
  --set-env-vars ASTRA_CLIENT_SECRET=$ASTRA_CLIENT_SECRET \
  --max-instances=10
```

You can describe the function with this command:

```sh
gcloud functions describe login
```

You can delete the function with this command:

```sh
gcloud functions delete login --region=us-west2
```

Sample REST call:

```sh
curl -X GET "https://ba99a63b-49f7-4ac1-8388-f3056a7a47a0-us-west1.apps.astra.datastax.com/api/rest/v2/keyspaces/callcenter/users/demo%40datastax.com/2a97516c354b68848cdbd8f54a226a0a55b21ed138e207ad6c5cbb9c00aa5aea?fields=username%2Cpassword%2Cuserid" -H  "accept: application/json" -H  "X-Cassandra-Token: AstraCS:WoYWnQGbzyQHooswjuyZRnoY:7be142be2764c8758ec9f37322a48cbd83ec99ff7a3740baf60e83b7160a6685"
```
