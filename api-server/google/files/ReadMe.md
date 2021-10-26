# Files

Before running these scripts, but sure to set your environment variables for:

- ASTRA_DB_ID
- ASTRA_DB_TOKEN
- KEYSPACE

I have then defined in the ```setenv.sh``` file in my ```database/``` directory in
the project. However, I hve NOT checked that file into Git for obvious reasons.

```sh
source ../../../database/setenv.sh
```

Best way to test this function is to upload a recording from the web app.

## Common Commands

### Deploy the function to the cloud

```sh
gcloud functions deploy files --runtime=nodejs14 --trigger-http \
  --region=us-west2 --allow-unauthenticated --memory=128MB \
  --set-env-vars ASTRA_DB_ID=$ASTRA_DB_ID \
  --set-env-vars ASTRA_DB_TOKEN=$ASTRA_DB_TOKEN \
  --set-env-vars KEYSPACE=$KEYSPACE \
  --set-env-vars ASTRA_DB_REGION=$ASTRA_DB_REGION \
  --set-env-vars ASTRA_CLIENT_ID=$ASTRA_CLIENT_ID \
  --set-env-vars ASTRA_CLIENT_SECRET=$ASTRA_CLIENT_SECRET \
  --max-instances=10
```

### Describe the function

```sh
gcloud functions describe files
```

### Delete the function

```sh
gcloud functions delete files --region=us-west2
```
