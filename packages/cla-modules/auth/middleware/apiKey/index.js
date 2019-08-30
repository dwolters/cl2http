module.exports = (secDef, connector) => {
    return (req) => {
        return new Promise((resolve, reject) => {
            let location = '';
            switch (secDef.in) {
                case 'header':
                    location = 'headers';
                    break;
                case 'cookie':
                    location = 'cookies';
                    break;
                default:
                    location = secDef.in;
            }
            let paramValue = req[location][secDef.name];
            if (!paramValue) {
                reject('Unauthorized (missing API Key)');
            } else {
                return connector.get(paramValue)
                    .then((record) => {
                        if (!record) {
                            reject('Unauthorized (invalid API Key)');
                        } else {
                            resolve();
                        }
                    });
            }
        });
    };
};
