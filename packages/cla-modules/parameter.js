const join = require('path').join;
const tmpdir = require('os').tmpdir();
const jsonpath = require('jsonpath-plus').JSONPath;
const {PROP} = require('./openapi-tools/OpenApiToolsBase');

/**
 * Creates a parameters object based on the given service operation specification and HTTP request.
 * @param {OpenApiObject} spec The OpenAPI service description.
 * @param {string} path The operation's path.
 * @param {string} method The operation's HTTP method.
 * @param {Object} options CLI options
 * @param {Object} request HTTP request
 * @return {Object} Parameters
 */
function extractParams(spec, path, method, options, request) {
    const openapi = require('./openapi-tools')(spec);
    const params = {};
    openapi.forEachOperationParameter(
        spec,
        path,
        method,
        (paramName, parameter) => {
            if (paramName != 'body') {
                // Body is handled separately below
                const varName = openapi.computeVariableName(parameter);
                const paramValue =
                    request[
                        openapi.parameterLocationToExpressRequestProperties(
                            parameter.in
                        )
                    ][paramName];
                params['=' + varName] = paramValue;
                const transform = openapi.getParameterTransformFunction(
                    parameter,
                    spec
                );
                params[':' + varName] = transform(paramValue);
            }
        }
    );
    let bodySpec = openapi.getBodySpec(spec, path, method);
    if (bodySpec) {
        params['=body'] = request.body;
        let transform = openapi.getRequestBodyTransformationFunction(
            bodySpec,
            request.headers['content-type']
        );
        params[':body'] = transform(request.body);
    }
    if (options.bodyToFile) {
        options.inputFileName =
            options.inputFileName || join(tmpdir, 'in' + Date.now());
        params['=inputFile'] = options.inputFileName;
        params[':inputFile'] = options.inputFileName;
    }
    if (options.fileToBody) {
        options.outputFileName =
            options.outputFileName || join(tmpdir, 'out' + Date.now());
        params['=outputFile'] = options.outputFileName;
        params[':outputFile'] = options.outputFileName;
    }
    return params;
}

/**
 * Replaces all parameter referenced in the given statement with their values.
 * @param {string} statement Parameterized statement
 * @param {Object} parameters Parameter values.
 * @return {string} Statement with substituted parameter values.
 */
function replace(statement, parameters = {}) {
    if (!statement) {
        return statement;
    }

    let result = statement;
    const unknownParams = [];
    const regex = /\$\{(.+)\}/g; // TODO Should ignore } in regular expressions.
    let m;

    while ((m = regex.exec(statement)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        // The result can be accessed through the `m`-variable.
        let match = m[1];
        if (match) {
            if (match.indexOf('.') != -1) {
                result = evaluateJsonPathQuery(result, match, parameters);
            } else if (match.indexOf('/') != -1) {
                result = evaluateRegExQuery(result, match, parameters);
            } else if (typeof parameters[match] === 'undefined') {
                unknownParams.push(match);
            } else {
                result = result.replace('${' + match + '}', parameters[match]);
            }
        }
    }
    if (unknownParams.length > 0) {
        throw new Error(`Unknown parameters: ${unknownParams}`);
    }
    return result;
}

/**
 * Evaluates the given JSON Path query on the respective parameter and inserts the result into the given statement.
 * @param {string} statement Statement in which the parameter should be substituted
 * @param {string} query Query that needs to be evaluated on a parameter
 * @param {object} parameters Set of all parameters
 * @return {string} Statement with parameter being replaced by query result
 */
function evaluateJsonPathQuery(statement, query, parameters) {
    const jsonPathExtractor = /^([:=][a-z]+)([.][^|]*)(?:[|]?(.*))?$/i;
    let match = query.match(jsonPathExtractor);
    if (match) {
        let paramName = match[1];
        let path = '$' + match[2];
        let separator = match[3] || ',';
        let paramValue = parameters[paramName];
        if (typeof paramValue === 'undefined') {
            throw new Error(`Unknown parameters: ${paramName}`);
        }
        if (typeof paramValue !== 'object') {
            paramValue = JSON.parse(paramValue);
        }
        let pathResult = jsonpath({
            path: path,
            json: paramValue,
        });
        if (paramName.startsWith(':')) {
            if (Array.isArray(pathResult)) {
                if (pathResult.length > 1) {
                    pathResult = '"' + pathResult.join(separator) + '"';
                } else if (pathResult.length == 1) {
                    pathResult = '"' + pathResult[0] + '"';
                }
            } else {
                pathResult = '';
            }
        }
        if (typeof pathResult == 'object') {
            pathResult = JSON.stringify(pathResult);
            pathResult = '"' + pathResult.replace(/"/g, '\\"') + '"';
        }
        return statement.replace('${' + query + '}', pathResult);
    } else {
        throw new Error(`Does not match JSON Path query: ${query}`);
    }
}

/**
 * Evaluates the given regular expression on the respective parameter and inserts the result into the given statement.
 * @param {string} statement Statement in which the parameter should be substituted
 * @param {string} query Query that needs to be evaluated on a parameter
 * @param {object} parameters Set of all parameters
 * @return {string} Statement with parameter being replaced by query result
 */
function evaluateRegExQuery(statement, query, parameters) {
    const regExExtractor = /^([:=][a-z]+)\/(.*)\/([a-z])*(?:[$]?([0-9]+))?(?:[|]?(.*))?$/i;
    let match = query.match(regExExtractor);
    if (match) {
        let paramName = match[1];
        let regExString = match[2];
        let regExFlags = match[3];
        let groupSelector = match[4] || 0;
        let separator = match[5] || ',';
        let paramValue = parameters[paramName];
        if (typeof paramValue === 'undefined') {
            throw new Error(`Unknown parameters: ${paramName}`);
        }
        if (typeof paramValue === 'object') {
            paramValue = JSON.stringify(paramValue);
        }
        let regex = RegExp(regExString, regExFlags);
        let result = [];
        let m;

        while ((m = regex.exec(paramValue)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index >= regex.lastIndex) {
                regex.lastIndex = m.index + m[0].length;
            }
            if (typeof m[groupSelector] !== 'undefined') {
                result.push(m[groupSelector]);
            }
            if (!regExFlags || regExFlags.indexOf('g') == -1) {
                break;
            }
        }

        if (paramName.startsWith(':')) {
            if (Array.isArray(result)) {
                if (result.length > 1) {
                    result = '"' + result.join(separator) + '"';
                } else if (result.length == 1) {
                    result = '"' + result[0] + '"';
                }
            } else {
                result = '';
            }
        }
        return statement.replace('${' + query + '}', result);
    } else {
        throw new Error(`Does not match reg ex query: ${query}`);
    }
}

/**
 * Replaces all parameters in the given response headers and returns a new headers object which contains the parameter values.
 * @param {Object} headers Response headers with parameters
 * @param {Object} params Parameters
 * @return {Object} Response headers with parameter values
 */
function mapHeaders(headers, params) {
    let newHeaders = {};
    if (headers) {
        for (let key in headers) {
            if (headers.hasOwnProperty(key) && headers[key][PROP.VALUE]) {
                newHeaders[key] = replace(headers[key][PROP.VALUE], params);
            }
        }
    }
    return newHeaders;
}

module.exports = {
    extractParams,
    replace,
    mapHeaders,
};
