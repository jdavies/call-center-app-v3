#
# This Node program needs to be packaged an installed on a server to serve API
# calls from the client.
#



tar cfz uploadServer.tgz README.md app.js package-lock.json package.json runServerApp.sh \
astraConfig bin config gcpConfig lib public routes views astraConfig



