const express = require('express');
const bodyParser = require('body-parser');
const handler = require('cla-modules/handler');

/**
 * Creates an Express app corresponding to the given OpenAPI service description.
 * @param {OpenApiObject} spec OpenAPI (v3.0.0 or v2.0) service description.
 * @return {Express} The corresponding Express app.
 */
function createExpressAppForSpec(spec) {
    const app = express();

    // enable CORS
    // see also: https://gist.github.com/cuppster/2344435
    app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

        // intercept OPTIONS method
        if ('OPTIONS' == req.method) {
            res.sendStatus(200);
        } else {
            next();
        }
    });

    app.use(bodyParser.urlencoded());
    app.use(bodyParser.json({type: 'application/*+json'}));
    app.use(bodyParser.json({type: 'application/json'}));
    app.use(bodyParser.text({type: 'text/plain'}));
    app.use(bodyParser.raw({type: '*/*'}));
    // TODO: also include cookie-parser to support cookie-parameters!

    const openapi = require('cla-modules/openapi-tools')(spec);

    openapi.validate(spec);

    // prepare auth middleware
    const middleware = {};
    openapi.forEachSecurityScheme(spec, (secName, secDef) => {
        const connDesc = openapi.getConnectorDescriptionForSecurityScheme(secDef);
        const connector = require('cla-modules/auth/connectors/' + connDesc.type)(connDesc);
        middleware[secName] = (req, res, next) => {
            const check = require(`cla-modules/auth/middleware/${secDef.type}/${secDef.scheme || 'index.js'}`)(secDef, connector);
            check(req, res)
                .then(() => next())
                .catch((err) => res.status(401).send(err));
        };
    });

    const createRequestHandler = (spec, path, method) => {
        return (req, res) => handler(spec, path, method, req, res);
    };

    const basePath = openapi.getBasePath(spec);
    openapi.forEachOperation(spec, (path, method, operation) => {
        const endpoint = openapi.convertOpenApiPathToExpressPath(path);
        if (openapi.isOperationSecured(spec, path, method)) {
            const mw = middleware[openapi.listOperationSecurities(spec, path, method)[0]];
            app[method](basePath + endpoint, mw, createRequestHandler(spec, path, method));
        } else {
            app[method](basePath + endpoint, createRequestHandler(spec, path, method));
        }
    });

    return app;
}

module.exports = createExpressAppForSpec;
