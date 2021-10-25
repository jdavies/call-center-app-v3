# Files

Best way to test this function is to upload a recording from the web app.

Deploy the function to the cloud:

```sh
gcloud functions deploy files --runtime=nodejs14 --trigger-http \
  --region=us-west2 --allow-unauthenticated --memory=128MB \
  --set-env-vars test='Test String' \
  --max-instances=10
```

You can describe the function with this command:

```sh
gcloud functions describe files
```

You can delete the function with this command:

```sh
gcloud functions delete files --region=us-west2
```


