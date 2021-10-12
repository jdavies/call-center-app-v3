#
# Note that the script source a file to set env var for
# SCB, Astra, and GCP credentials.
#



export CONTAINER_UPLOAD_DIR='/uploads'
export HOST_UPLOAD_DIR=$(pwd)/uploads
export NODE_ENV=dev
# export DEBUG=*
export UPLOAD_DIR='./uploads'

source ./config/astraCreds.sh

npm start
