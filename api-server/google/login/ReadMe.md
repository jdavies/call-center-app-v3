# Login

To test the login function, use th following payload n the body of the test call:

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
  --max-instances=10
```

You can describe the function with this command:

```sh
gcloud functions describe login
```

You can delete the function with this command:

```sh
gcloud functions delete login
```
