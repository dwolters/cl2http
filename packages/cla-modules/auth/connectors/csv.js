const readFile = require('fs').readFileSync;
const parse = require('csv-parse/lib/sync');

module.exports = (connDesc) => {
    const connector = {
        records: {},
        get: (id) => {
            if (!id) {
                return Promise.resolve(null);
            }
            const record = connector.records[id];
            if (connDesc.mapping && record) {
                const result = {};
                Object.keys(connDesc.mapping).forEach((key) => {
                    result[key] = record[connDesc.mapping[key]];
                });
                return Promise.resolve(result);
            } else {
                return Promise.resolve(record);
            }
        },
    };

    const csv = parse(readFile(connDesc.source), connDesc.options);
    csv.forEach((record) => {
        connector.records[record[connDesc.index]] = record;
    });

    return connector;
};
