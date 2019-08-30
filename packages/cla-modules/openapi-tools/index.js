const OpenApiToolsBase = require('./OpenApiToolsBase');

module.exports = (spec) => {
    if (OpenApiToolsBase.isSwagger2Spec(spec)) {
        return require('./OpenApiToolsV2');
    }

    if (OpenApiToolsBase.isOpenAPIv3Spec(spec)) {
        return require('./OpenApiToolsV3');
    }

    throw new Error('Unsupported Specification Version!');
};
