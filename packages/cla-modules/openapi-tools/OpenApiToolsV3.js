/* eslint-disable require-jsdoc */

const URL = require('url');
const OpenApiToolsBase = require('./OpenApiToolsBase');
const isMediaType = require('type-is').is;

module.exports = class OpenApiToolsV3 extends OpenApiToolsBase {
    static get PARAM_LOCATION() {
        return Object.assign({},
            super.PARAM_LOCATION,
            {
                // OpenAPI 3 only
                COOKIE: 'cookie',
            }
        );
    }

    static validate(spec) {
        super.validate(spec);
        if (!spec.servers || spec.servers.length != 1) {
            throw new Error('Property "servers" is missing or does not list exactly one server!');
        }
        if (!spec.servers[0].variables || !spec.servers[0].variables.basePath) {
            throw new Error('Variable "basePath" is missing at server object!');
        }
    }

    static getBasePath(spec) {
        const bp = spec.servers[0].variables.basePath.default;
        return bp? '/' + bp : '';
    }

    static getBodySpec(spec, path, method) {
        return this.getOperationObject(spec, path, method).requestBody;
    }

    static parameterLocationToExpressRequestProperties(location) {
        const s = super.parameterLocationToExpressRequestProperties(location);
        if (location === s) {
            if (location === this.PARAM_LOCATION.COOKIE) {
                return 'cookies';
            } else {
                return location;
            }
        }
        return s;
    }

    static forEachSecurityScheme(spec, callback) {
        if (spec.components && spec.components.securitySchemes) {
            const names = Object.keys(spec.components.securitySchemes);
            for (let name of names) {
                callback(name, spec.components.securitySchemes[name]);
            }
        }
    }

    static getPort(spec, port) {
        let p = null;
        if (spec.servers && spec.servers[0].url) {
            p = URL.parse(spec.servers[0].url).port;
        }
        return super.getPort(spec, port || p);
    }

    static getResponseContent(response, contentType) {
        if (response && response.content) {
            for (let mediaType in response.content) {
                if (isMediaType(contentType, [mediaType])) {
                    response.content[mediaType][this.PROP.CONTENT_TYPE] = contentType;
                    return response.content[mediaType];
                }
            }
            let keys = Object.keys(response.content);
            if (keys.length) {
                let mediaType = keys[0];
                response.content[mediaType][this.PROP.CONTENT_TYPE] = mediaType;
                return response.content[mediaType];
            }
        }
        return {};
    }

    static getRequestBodyTransformationFunction(bodySpec, contentType, spec) {
        if (bodySpec.content && contentType) {
            for (let mediaType in bodySpec.content) {
                if (isMediaType(contentType, [mediaType])) {
                    return this.getParameterTransformFunction(bodySpec.content[contentType], spec);
                }
            }
        }
        return (x) => x;
    }
};
