const openapi = require('cla-modules/openapi-tools/OpenApiToolsV3');

module.exports = (oa3spec) => {
    const spec = JSON.parse(JSON.stringify(oa3spec)); // deep copy

    // formalities
    delete spec.openapi;
    spec.swagger = '2.0';

    // server
    spec.basePath = openapi.getBasePath(spec);
    spec.host = spec.servers[0].url.replace(/http(s?):\/\//, '').replace(/\/\{basePath\}/, '');
    delete spec.servers;

    // security
    if (spec.components && spec.components.securitySchemes) {
        spec.securityDefinitions = {};
        openapi.forEachSecurityScheme(spec, (name, secDef) => {
        if (secDef.type === 'http' && secDef.scheme === 'basic') {
                secDef.type = 'basic';
                delete secDef.scheme;
            }
            spec.securityDefinitions[name] = secDef;
        });
        delete spec.components.securitySchemes;
    }

    // operations
    openapi.forEachOperation(spec, (path, method, operation) => {
        let responses = operation.responses;
        // responses
        for (let status in responses) {
            if (responses.hasOwnProperty(status)) {
                let response = responses[status];
                if (typeof response.content === 'object') {
                    let keys = Object.keys(response.content);
                    if (keys.length > 0) {
                        let firstResponseContent = response.content[keys[0]];
                        response.schema = firstResponseContent.schema;
                        response[openapi.PROP.VALUE] = firstResponseContent[openapi.PROP.VALUE];
                        response[openapi.PROP.PARAMETER_TRANSFORMATION] = firstResponseContent[openapi.PROP.PARAMETER_TRANSFORMATION];
                        delete response.content;
                    }
                }
            }
        }

        // parameters
        openapi.forEachOperationParameter(spec, path, method, (paramName, param) => {
            delete param.style;
            param.type = param.schema.type;
            delete param.schema;
        });

        // body
        if (operation.requestBody) {
            const firstMediaType = Object.keys(operation.requestBody.content)[0];
            const content = operation.requestBody.content[firstMediaType];
            operation.parameters = operation.parameters || [];
            let parameterObject = {
                'name': 'body',
                'in': 'body',
                'schema': content.schema,
                'x-transform': content['x-transform'],
            };
            operation.parameters.push(parameterObject);
            delete operation.requestBody;
        }
    });

    delete spec.components;
    return spec;
};
