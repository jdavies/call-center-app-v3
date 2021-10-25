date
gcloud functions deploy files --runtime=nodejs14 --trigger-http \
  --region=us-west2 --allow-unauthenticated --memory=128MB \
  --set-env-vars test='Test String' \
  --max-instances=10
date

