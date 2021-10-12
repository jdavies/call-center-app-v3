const { getCollection } = require("./astra/astraClient");

getUserRecords = async function (username) {
    console.log('Calling getUserSummary collection');
    const users = await getCollection();
    try {
        let res = {};
        if (username) {
            res = await users.get(username);
        } else {
            res = await users.find({});  //get All
        }
        // console.log(JSON.stringify(Object.keys(res).map((i) => res[i])));
        return(res);
        // return {
        //     statusCode: 200,
        //     body: JSON.stringify(Object.keys(res).map((i) => res[i])),
        // };
    } catch (e) {
        console.error('users.get failed');
        console.error(e);
        throw (e);
        // return {
        //     statusCode: 500,
        //     body: JSON.stringify(e),
        // };
    }
};


exports.handler = async (event, context) => {
    const username = event.queryStringParameters.username || undefined;

    return getUserRecords(username)
        .then(retData => {
            console.log('getCollection returned');
            console.log(retData);
            return {
                statusCode: 200,
                body: JSON.stringify(Object.keys(retData).map((i) => retData[i])),
            };
        }).catch(errData => {
        console.error('getCollection returned error');
        console.error(errData);
        return {
            statusCode: 500,
            body: `Sorry, could not get recordings`,
        };
    });

};

