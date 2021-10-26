source ../../../database/setenv.sh
date
gcloud functions deploy login --runtime=nodejs14 --trigger-http \
  --region=us-west2 --allow-unauthenticated --memory=128MB \
  --set-env-vars ASTRA_DB_ID=$ASTRA_DB_ID \
  --set-env-vars ASTRA_DB_TOKEN=$ASTRA_DB_TOKEN \
  --set-env-vars KEYSPACE=$KEYSPACE \
  --set-env-vars ASTRA_DB_REGION=$ASTRA_DB_REGION \
  --set-env-vars ASTRA_CLIENT_ID=$ASTRA_CLIENT_ID \
  --set-env-vars ASTRA_CLIENT_SECRET=$ASTRA_CLIENT_SECRET \
  --set-env-vars JWT_SECRET=$JWT_SECRET \
  --max-instances=10
date

