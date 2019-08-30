const parse = require('querystring').parse;

module.exports = (secDef, connector) => {
    return (req) => {
        return new Promise((resolve, reject) => {
            const token = extractToken(req);
            if (!token) {
                reject('Unauthorized (missing Bearer token)');
            } else {
                return connector.get(token)
                    .then((record) => {
                        if (!record) {
                            reject('Unauthorized (invalid Bearer token)');
                        } else {
                            resolve();
                        }
                    });
            }
        });
    };
};

/**
 * Extracts a bearer token from the given express request.
 * @param {ExpressRequest} req The express request.
 * @return {string} The extracted Bearer token (without the "Bearer " prefix).
 */
function extractToken(req) {
    let token = null;
    if (req.get('Authorization')) {
        token = req.get('Authorization');
    }
    if (req.get('Content-Type') === 'application/x-www-form-urlencoded') {
        token = req.body.access_token;
    }
    if (req.query.access_token) {
        token = req.query.access_token;
    }
    if (token) {
        token = token.replace('Bearer ', '');
    }
    return token;
}
