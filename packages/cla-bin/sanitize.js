module.exports = (spec) => {
    spec = JSON.parse(JSON.stringify(spec));
    const openapi = require('cla-modules/openapi-tools')(spec);
    delete spec[openapi.PROP.SSL_CONFIG];
    delete spec[openapi.PROP.DOCKER_CONFIG];
    delete spec[openapi.PROP.GLOBAL_TRANSFORMATIONS];
    openapi.forEachOperation(spec, (path, method, operation) => {
        delete spec.paths[path][method][openapi.PROP.CLI_CONFIG];
        let responses = spec.paths[path][method].responses || {};
        for (let status in responses) {
            let response = responses[status];
            delete response[openapi.PROP.VALUE];
            delete response[openapi.PROP.PARAMETER_TRANSFORMATION];
            if (response.content) {
                for (let type in response.content) {
                    delete response.content[type][openapi.PROP.VALUE];
                    delete response.content[type][openapi.PROP.PARAMETER_TRANSFORMATION];
                }
            }
            if (response.headers) {
                for (let header in response.headers) {
                    delete response.headers[header][openapi.PROP.VALUE];
                }
            }
        }
        openapi.forEachOperationParameter(spec, path, method, (paramName, paramObj) => {
            delete paramObj[openapi.PROP.PARAMETER_TRANSFORMATION];
            spec.paths[path][method].parameters.push(paramObj);
        });
    });
    openapi.forEachSecurityScheme(spec, (secName) => {
        if (openapi.isSwagger2Spec(spec)) {
            delete spec.securityDefinitions[secName][openapi.PROP.CONNECTOR_CONFIG];
        } else if (openapi.isOpenAPIv3Spec(spec)) {
            delete spec.components.securitySchemes[secName][openapi.PROP.CONNECTOR_CONFIG];
        }
    });
    return spec;
};
