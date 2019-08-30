const debuglog = require('util').debuglog('cli');
const fs = require('fs-promise');
const parameter = require('./parameter');
const execute = require('./executor');

/**
 * Unlinks used input and output files
 * @param {Object} options Options to determine which files have been used
 */
function unlinkInputOutputFiles(options) {
    if (options.bodyToFile) {
        fs.unlink(options.inputFileName);
    }
    if (options.fileToBody && options.executable) {
        fs.unlink(options.outputFileName);
    }
}

module.exports = async function(spec, path, method, req, res) {
    const openapi = require('./openapi-tools')(spec);
    const options = openapi.getCliConfigFromOperation(spec, path, method);

    // extract parameters
    const params = parameter.extractParams(spec, path, method, options, req);
    let input = null;
    let command = null;
    let exitCode = 0;
    let output = '';
    let error = '';
    try {
        command = parameter.replace(options.command, params);
        if (options.input) {
            input = parameter.replace(options.input, params);
        } else {
            input = params[':body'];
        }

        if (options.bodyToFile) {
            await fs.writeFile(options.inputFileName, input);
            input = undefined;
        }

        if (command) {
            let result = await execute(command, input);
            exitCode = result.code;
            output = result.output;
            error = result.error;
        } else {
            if (options.outputFileName && options.fileToBody !== false) {
                options.fileToBody = true;
            } else {
                console.log(spec, path, method, options.command);
                throw new Error(
                    'x-cli information inconsistent. See documentation'
                );
            }
        }

        // TODO: Move into parameters.js
        params[':' + output] = params['=' + output] = output;
        params[':' + error] = params['=' + error] = error;
        let {status, response} = openapi.getResponseByCode(
            spec,
            path,
            method,
            exitCode
        );

        res.status(status);
        let headers = {};
        if (response && response.headers) {
            headers = parameter.mapHeaders(response.headers, params);
            for (let key in headers) {
                res.set(key, headers[key]);
            }
        }

        let contentType = headers['Content-Type'] || params[':accept'];

        if (!contentType) {
            contentType = openapi.getContentTypeByResponse(response);
            if (contentType) {
                res.set('Content-Type', contentType);
            }
        }

        let body = openapi.getResponseBody(response, contentType);

        if (body) {
            res.send(parameter.replace(body, params));
        } else if (exitCode != 0) {
            res.send(error);
        } else if (options.fileToBody) {
            res.send(await fs.readFile(options.outputFileName));
        } else {
            let transformBody = openapi.getResponseTransformFunction(response, contentType, spec);
            res.send(transformBody(output));
        }
        unlinkInputOutputFiles(options);
    } catch (err) {
        debuglog(err);
        res.status(500);
        console.error('Error during execution: ', err);
        res.send('Internal Server Error');
        return;
    }
};
