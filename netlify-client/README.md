
# Part of Call Center App Demo

The CallCenterApp simulates a Call Center where customers call in, leave a message, that gets processed with
speech to text service from the cloud provider.  The text from the speech is populated back into Astra so that
a call center agent can review and call the customer.

# This code
Angular code so you can do 

```sh
ng serve
```

And get it to run.

# Set up

```netlify.toml``` is setting the env vars that the program needs.  You need to
change if to point to your Astra instance.

The schema definition is not under this dir.  

# Netlify
Install netlify dev and you can run it

netlify dev

There is a netlify function implemented that use the Document API to
access Astra and get a specific user's messages.  Currently, you have 
to enter a URI to get the list.  It is not presented in a UI screen 
at the moment.

# Server used

You will see that the code uses a backend server.  That is the api-server 
currently in Node.  That code should move into netlify functions used by this
dir.

We have that code so that we can showcase 'app servers' and a Node client
that consumes the Node driver w/ CQL statements.

