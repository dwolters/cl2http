/* eslint-disable require-jsdoc */

const URL = require('url');
const OpenApiToolsBase = require('./OpenApiToolsBase');

module.exports = class OpenApiToolsV2 extends OpenApiToolsBase {
    static get PARAM_LOCATION() {
        return Object.assign({},
            super.PARAM_LOCATION,
            {
                // Swagger 2 only
                BODY: 'body',
                FORM_DATA: 'formData',
            }
        );
    }

    static getBasePath(spec) {
        return spec.basePath || '';
    }

    static getBodySpec(spec, path, method) {
        let bodySpec = undefined;
        this.forEachOperationParameter(spec, path, method, (paramName, param) => {
            if (param.in === this.PARAM_LOCATION.BODY) {
                bodySpec = param;
            }
        });
        return bodySpec;
    }

    static parameterLocationToExpressRequestProperties(location) {
        const s = super.parameterLocationToExpressRequestProperties(location);
        if (location === s) {
            if (location === this.PARAM_LOCATION.BODY || location === this.PARAM_LOCATION.FORM_DATA) {
                return 'body';
            } else {
                return location;
            }
        }
        return s;
    }

    static forEachSecurityScheme(spec, callback) {
        if (spec.securityDefinitions) {
            Object.keys(spec.securityDefinitions)
                .forEach((secDefName) => {
                    const secDef = spec.securityDefinitions[secDefName];
                    if (secDef.type === 'basic') {
                        secDef.type = 'http';
                        secDef.scheme = 'basic';
                    }
                    callback(secDefName, secDef);
                });
        }
    }

    static getPort(spec, port) {
        let p = null;
        if (spec.host) {
            p = URL.parse('http://' + spec.host).port;
        }
        return super.getPort(spec, port || p);
    }

    static getResponseContent(response, contentType) {
        return response || {};
    }

    static getRequestBodyTransformationFunction(bodySpec, contentType, spec) {
        return this.getParameterTransformFunction(bodySpec, spec);
    }
};
