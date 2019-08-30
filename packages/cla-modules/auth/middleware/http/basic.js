const crypto = require('crypto');
const parseAuth = require('basic-auth');

module.exports = (secDef, connector) => {
    return (req) => {
        return new Promise((resolve, reject) => {
            const user = parseAuth(req);
            if (!user) {
                reject('Unauthorized (missing HTTP basic auth)');
            } else {
                return connector.get(user.name)
                    .then((userRecord) => {
                        if (!userRecord) {
                            reject(`Unauthorized (user ${user.name} does not exist)`);
                        } else {
                            const computedHash = crypto.createHmac('sha256', userRecord.salt+user.pass).digest('hex');
                            if (computedHash !== userRecord.password) {
                                reject('Unauthorized (invalid password)');
                            } else {
                                resolve();
                            }
                        }
                    });
            }
        });
    };
};
