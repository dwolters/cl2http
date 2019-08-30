/* eslint-disable valid-jsdoc */

const camelCase = require('camelcase');
const methods = require('./methods');
const funcster = require('funcster');
const isMediaType = require('type-is').is;

module.exports = class OpenApiToolsBase {
    /**
     * Houses constants for custom property names.
     */
    static get PROP() {
        return {
            PARAMETER_TRANSFORMATION: 'x-transform',
            GLOBAL_TRANSFORMATIONS: 'x-transforms',
            CLI_CONFIG: 'x-cli',
            CONNECTOR_CONFIG: 'x-connector',
            SSL_CONFIG: 'x-ssl',
            DOCKER_CONFIG: 'x-docker',
            VALUE: 'x-value',
            CODE: 'x-code',
            CONTENT_TYPE: 'x-content-type',
        };
    }

    /**
     * Houses constants for header locations.
     */
    static get PARAM_LOCATION() {
        return {
            HEADER: 'header',
            QUERY: 'query',
            PATH: 'path',
            // additional locations defined in subclasses!
        };
    }

    /**
     * Checks if the given service description is an OpenAPI 3.0.x service description.
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @return {boolean} True if the service description is an OpenAPI 3.0.x service description, false otherwise.
     */
    static isOpenAPIv3Spec(spec) {
        return spec.openapi && spec.openapi.startsWith('3.0');
    }

    /**
     * Checks if the given service description is an Swagger 2.0 service description.
     * @param {OpenApiObject} spec The Swagger service description.
     * @return {boolean} True if the service description is an Swagger 2.0 service description, false otherwise.
     */
    static isSwagger2Spec(spec) {
        return spec.swagger === '2.0';
    }

    /**
     * Maps an OpenAPI parameter location to the associated express Request property.
     * @param {string} location OpenAPI parameter location (specified by the parameter's "in" property).
     * @return {string} The associated name of the express Request property.
     */
    static parameterLocationToExpressRequestProperties(location) {
        let prop = location;
        switch (location) {
            case this.PARAM_LOCATION.PATH:
                prop = 'params';
                break;
            case this.PARAM_LOCATION.HEADER:
                prop = 'headers';
                break;
            case this.PARAM_LOCATION.QUERY:
                prop = 'query';
                break;
        }
        return prop;
    }

    /**
     * Computes the variable name for a given parameter.
     * @param {OpenApiParameterObject} parameter The parameter object whose variable name to compute.
     * @return {string} The variable name for the parameter.
     */
    static computeVariableName(parameter) {
        if (parameter.in === this.PARAM_LOCATION.HEADER) {
            return camelCase(parameter.name.toLowerCase());
        }
        return parameter.name;
    }

    /**
     * Checks whether a service uses HTTPS.
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @return {boolean} True if the service uses HTTPS, false otherwise
     */
    static usesHttps(spec) {
        return spec[this.PROP.SSL_CONFIG];
    }

    /**
     * Extracts the SSL configuration from a service description.
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @return {{key: string, certificate: string}} The SSL configuration pointing to key and certificate.
     */
    static getSslConfig(spec) {
        return spec[this.PROP.SSL_CONFIG];
    }

    /**
     * Extracts the Docker configuration from a service description.
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @return {DockerConfigurationObject} The Docker configuration.
     */
    static getDockerConfig(spec) {
        return spec[this.PROP.DOCKER_CONFIG];
    }

    /**
     * Extracts the transformation function/dictionary from a given parameter.
     * If the transformation is specified in form of an object, it is automatically transformed into a function.
     * If no transformation is specified, the identity function is returned.
     *
     * @param {OpenApiParameterObject} parameter The OpenAPI parameter object.
     * @param {OpenApiObject} [spec] OpenAPI service description (needed only if transform might be referenced).
     * @return {(originalValue: any) => any} Transformation function.
     */
    static getParameterTransformFunction(parameter, spec) {
        return this.createTransformFunction(
            parameter[this.PROP.PARAMETER_TRANSFORMATION],
            spec
        );
    }

    /**
     * Returns the transformation function for the given response object based on the used content type.
     * @param {*} response Response object
     * @param {*} contentType Content type of the response
     * @param {OpenApiObject} spec OpenAPI service description
     * @return {(originalValue: any) => any} Transformation function.
     */
    static getResponseTransformFunction(response, contentType, spec) {
        let responseContent = this.getResponseContent(response, contentType);
        return this.createTransformFunction(
            responseContent[this.PROP.PARAMETER_TRANSFORMATION],
            spec
        );
    }

    /**
     * Converts the given transformation specification into a function.
     * @param {Object|String|Function} transform The extracted transformation specification.
     * @param {OpenApiObject} [spec] The OpenAPI service description (needed only if transform might be referenced).
     * @return {(originalValue: any) => any} The transformation function (never falsy).
     */
    static createTransformFunction(transform, spec) {
        if (!transform) {
            return (value) => value;
        } else {
            switch (typeof transform) {
                case 'object':
                    return (key) => transform[key];
                case 'string': {
                    if (transform.match(/^function/)) {
                        let fn = funcster.deepDeserialize({
                            __js_function: transform,
                        });
                        return fn;
                    }
                    if (
                        !spec ||
                        !spec[this.PROP.GLOBAL_TRANSFORMATIONS] ||
                        !spec[this.PROP.GLOBAL_TRANSFORMATIONS][transform]
                    ) {
                        throw new Error(
                            !spec
                                ? 'Service description is missing!'
                                : 'Referenced transform function is not defined in given spec!'
                        );
                    }
                    const fn = this.createTransformFunction(
                        spec[this.PROP.GLOBAL_TRANSFORMATIONS][transform],
                        spec
                    );
                    return (value) => fn(value);
                }
                default:
                    throw new Error(
                        'Transformation has to be specified as object or function or specified via a string!'
                    );
            }
        }
    }

    /**
     * Returns the operation object identified by the specified path and HTTP method.
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @param {string} path The operation's path.
     * @param {string} method The operation's HTTP method.
     * @return {OpenApiOperationObject} The operation object.
     */
    static getOperationObject(spec, path, method) {
        return spec.paths[path][method.toLowerCase()];
    }

    /**
     * Returns the responses object identified by the specified path and HTTP method.
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @param {string} path The operation's path.
     * @param {string} method The operation's HTTP method.
     * @return {OpenApiResponsesObject} The responses object.
     */
    static getResponsesObject(spec, path, method) {
        return this.getOperationObject(spec, path, method).responses || {};
    }

    /**
     * Converts an OpenAPI path to an express path.
     * @param {string} path OpenAPI path object
     * @return {string} Path with express parameters
     */
    static convertOpenApiPathToExpressPath(path) {
        return path.replace(
            /\{[A-Za-z0-9_]+\}/g,
            (param) => ':' + param.substr(1, param.length - 2)
        );
    }

    /**
     * Invokes the provided callback for each path listed in the given OpenAPI service description.
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @param {(pathName: string, pathObject: PathItemObject) => any} callback The callback to invoke with the name of the path and the path item object.
     */
    static forEachPath(spec, callback) {
        Object.keys(spec.paths).forEach((path) =>
            callback(path, spec.paths[path])
        );
    }

    /**
     * Invokes the provided callback for each operation listed in the given OpenAPI service description.
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @param {(path: string, method: string, operation: OperationObject) => any} callback The callback to
     *  invoke with the name of the path, the HTTP method of the operation and the operation object itself.
     */
    static forEachOperation(spec, callback) {
        this.forEachPath(spec, (pathName, path) => {
            methods.forEach((method) => {
                if (path[method]) {
                    callback(pathName, method, path[method]);
                }
            });
        });
    }

    /**
     * Enumerates all parameters for a given operation (including those which were specified at its path).
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @param {string} pathName The path housing the operation.
     * @param {string} method HTTP method of the operation.
     * @param {(parameterName: string, parameterObject: ParameterObject) => any} callback Callback function to invoke.
     */
    static forEachOperationParameter(spec, pathName, method, callback) {
        const path = spec.paths[pathName];
        const operation = this.getOperationObject(spec, pathName, method);
        const invokeCallback = (param) => {
            let paramName = param.name;
            if (param.in === this.PARAM_LOCATION.HEADER) {
                paramName = paramName.toLowerCase();
            }
            callback(paramName, param);
        };
        (path.parameters || []).forEach(invokeCallback);
        (operation.parameters || []).forEach(invokeCallback);
    }

    /**
     * Returns the CLI configuration ('x-cli') provided with the given operation.
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @param {string} path Path under which the operation is available.
     * @param {string} method HTTP method of the operation.
     * @return {Object} The specified configuration.
     */
    static getCliConfigFromOperation(spec, path, method) {
        return this.getOperationObject(spec, path, method)[
            this.PROP.CLI_CONFIG
        ];
    }

    /**
     * Checks whether a parameter is required.
     * @param {OpenApiParameter} parameter The OpenAPI Parameter Object.
     * @return {boolean} True if the parameter is required, false otherwise.
     */
    static isParameterRequired(parameter) {
        return parameter.required || parameter.in === this.PARAM_LOCATION.PATH;
    }

    /**
     * Validates the given OpenAPI service description. Throws if the description is invalid.
     * @param {OpenApiObject} spec The OpenAPI service description to validate.
     */
    static validate(spec) {
        if (!spec.paths) {
            throw new Error('No paths defined in OpenAPI specification.');
        }
        this.forEachOperation(spec, (path, method, operation) => {
            let options = this.getCliConfigFromOperation(spec, path, method);
            if (!options) {
                throw new Error(
                    `No CLI options defined for method ${method} in path ${path}`
                );
            }
            if (!options.command && !options.outputFileName) {
                throw new Error(
                    `No command or outputFileName defined for method ${method} in path ${path}`
                );
            }
        });
    }

    /**
     * Checks whether an operation is secured (either via a global or local security requirement).
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @param {string} path Path under which the operation is available.
     * @param {string} method HTTP method of the operation.
     * @return {boolean} True if the operation specifies a security requirement, false otherwise.
     */
    static isOperationSecured(spec, path, method) {
        return this.listOperationSecurities(spec, path, method).length > 0;
    }

    /**
     * Lists all security requirements for an operation.
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @param {string} path Path under which the operation is available.
     * @param {string} method HTTP method of the operation.
     * @return {string[]} Array of security requirement specifications (not null).
     */
    static listOperationSecurities(spec, path, method) {
        const listSecurities = (obj) => {
            let list = [];
            if (obj.security && obj.security.length > 0) {
                obj.security.forEach((secObj) => {
                    list.push(Object.keys(secObj)[0]);
                });
            }
            return list;
        };
        const operation = this.getOperationObject(spec, path, method);
        let names = listSecurities(spec).concat(listSecurities(operation));
        return names.filter(function(item, pos) {
            return names.indexOf(item) == pos;
        });
    }

    /**
     * Returns the "Connector" associated with a security scheme
     * @param {SecurityScheme} scheme Security Scheme.
     * @return {Connector} The associated "Connector".
     */
    static getConnectorDescriptionForSecurityScheme(scheme) {
        return scheme[this.PROP.CONNECTOR_CONFIG];
    }

    /**
     * Returns the port listed in the given service specification.
     * @param {OpenApiObject} spec OpenAPI service description.
     * @return {number} The listed port.
     */
    static getPort(spec, port) {
        if (port) {
            return port;
        }
        return this.usesHttps(spec) ? 443 : 80;
    }

    /**
     * Checks if a given path matches the given OpenAPI path template.
     *
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @param {string} template The path template string (without base path).
     * @param {string} path The actual path (with base path).
     */
    static pathMatchesTemplate(spec, template, path) {
        const regex = template.replace(/\{.*?\}/g, '.*?');
        return path.match(regex);
    }

    /**
     * Invokes the specified callback function for each security definition listed in the given service description.
     * @param {OpenApiObject} spec OpenAPI service description.
     * @param {(secName: string, secDef: SecurityScheme) => any} callback Callback function to invoke.
     */
    static forEachSecurityScheme(spec, callback) {
        throw new Error('Not yet implemented: forEachSecurityScheme');
    }

    /**
     * Gets the base path specified in the given OpenAPI service description.
     * @param {OpenApiObject} spec The OpenAPI service description to validate.
     * @return {string} The specified base path. Empty string if no base path is specified.
     */
    static getBasePath(spec) {
        throw new Error('Not yet implemented: getBasePath');
    }

    /**
     * Retrieves the specification of the body parameter
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @param {string} path Operation path.
     * @param {string} method Operation HTTP method.
     * @return {object} Specification of the body parameter
     */
    static getBodySpec(spec, path, method) {
        throw new Error('Not yet implemented: getBodySpec');
    }

    /**
     * Gets the content description from a response object based on the content type of the response.
     * @param {*} response Response object for a certain status code
     * @param {*} contentType Content Type of the response to identify the proper content description
     * @return {object} Content description of the response
     */
    static getResponseContent(response, contentType) {
        throw new Error('Not yet implemented: getResponseContent');
    }

    /**
     * Returns the response object mapped to the given exit code. By default exit code 0 is mapped to HTTP Status Code 200 and all other exit codes are mapped to HTTP Status Code 500.
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @param {string} path The operation's path.
     * @param {string} method The operation's HTTP method.
     * @param {number} code Exit code of the command-line call
     * @return {Object} status code and corresponding OpenAPI response object
     */
    static getResponseByCode(spec, path, method, code) {
        let responses = this.getResponsesObject(spec, path, method);
        for (let status in responses) {
            if (responses.hasOwnProperty(status)) {
                if (responses[status][this.PROP.CODE] == code) {
                    return {status: status, response: responses[status]};
                }
            }
        }
        if (code === 0) {
            return {status: 200, response: responses[200]};
        }
        return {status: 500, response: responses[500]};
    }

    /**
     * Gets the body description of the response content object.
     * @param {OpenApiReponseContent} responseContent Content description of the response object
     * @return {string} body description
     */
    static getResponseBody(response = {}, contentType = '') {
        let content = this.getResponseContent(response, contentType);
        return content[this.PROP.VALUE];
    }

    /**
     * Determines a default content type based on the JSON schema description of the response.
     * @param {object} schema JSON schema description of the response
     * @return {string} 'application/json' in case of an object and 'text/plain' if it is a none-binary string. By default an empty content type is returned.
     */
    static getContentTypeBySchema(schema = {}) {
        // TODO add support for referenced schema
        if (schema.type === 'object') {
            return 'application/json';
        } else if (schema.type === 'string' && schema.format != 'binary') {
            return 'text/plain';
        }
        return '';
    }

    /**
     * Determines a content type based on the response object. Either by selecting the first defined response content or determining the content type based on the schema description
     * @param {object} response Response object
     * @return {string} determined content type or empty string if none could be determined.
     */
    static getContentTypeByResponse(response) {
        let responseContent = this.getResponseContent(response);
        let contentType =
            responseContent[this.PROP.CONTENT_TYPE] ||
            this.getContentTypeBySchema(responseContent.schema);
        if (isMediaType(contentType, ['*/*'])) {
            return contentType;
        }
        return '';
    }

    /**
     * Returns the transformation function for the request body.
     * @param {*} bodySpec Specification of the request body
     * @param {*} contentType Content type of the body
     * @param {OpenApiObject} spec The OpenAPI service description.
     * @return {function} Transformation function
     */
    static getRequestBodyTransformationFunction(bodySpec, contentType, spec) {
        throw new Error('Not yet implemented: getRequestBodyTransformationFunction');
    }
};
