'use strict';
const handler = require('cla-modules/handler');

exports.handler = (event, context, callback) => {
    console.log('event', event);

    const spec = require('jsonfile').readFileSync(process.env.SPEC);
    const openapi = require('cla-modules/openapi-tools')(spec);
    const concretePath = event.path;
    const method = event.httpMethod.toLowerCase();

    // get corresponding OpenAPI Operation object
    let path = null;
    openapi.forEachPath(spec, (pathTemplate, operations) => {
        if (openapi.pathMatchesTemplate(spec, pathTemplate, concretePath)) {
            if (operations[method]) {
                path = pathTemplate;
            }
        }
    });

    if (!path) {
        callback(null, {
            statusCode: 404,
            body: `Unable to locate operation: [${method}] ${concretePath}`,
        });
        return;
    }

    // convert to Express request/response
    const req = {
        method: event.httpMethod,
        path: concretePath,
        headers: event.headers,
        get: (key) => req.headers[key],
        query: event.queryStringParameters,
        params: event.pathParameters,
        body: (event.isBase64Encoded) ? Buffer.from(event.body, 'base64') : event.body,
    };
    // required for basic-auth to work
    Object.keys(req.headers).forEach((header) => {
        req.headers[header.toLowerCase()] = req.headers[header];
    });
    console.log('req', req);

    const response = {
        statusCode: 200,
        headers: {},
        body: '',
    };

    const res = {
        status: (s) => {
            response.statusCode = s;
            return res;
        },
        set: (header, value) => {
            response.headers[header] = value;
            return res;
        },
        send: (data) => {
            response.body = data;
            console.log('res:', response);
            callback(null, response);
        },
        end: (data) => {
            response.body = data;
            console.log('res:', response);
            callback(null, response);
        },
    };

    // check auth
    let authCheck = null;
    const securities = openapi.listOperationSecurities(spec, path, method);
    if ((securities || []).length > 0) {
        openapi.forEachSecurityScheme(spec, (secName, secDef) => {
            if (secName === securities[0]) {
                const connDesc = openapi.getConnectorDescriptionForSecurityScheme(secDef);
                const connector = require('cla-modules/auth/connectors/' + connDesc.type)(connDesc);
                const check = require(`cla-modules/auth/middleware/${secDef.type}/${secDef.scheme || 'index.js'}`)(secDef, connector);
                authCheck = check(req);
            }
        });
    } else {
        authCheck = Promise.resolve();
    }

    // execute handler or return error on missing auth
    authCheck
        .then(() => handler(spec, path, method, req, res))
        .catch((err) => res.status(401).send(err));
};
