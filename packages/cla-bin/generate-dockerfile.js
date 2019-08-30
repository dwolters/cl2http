/* eslint-disable no-undef */

module.exports = (spec, specPath, local = false) => {
    const openapi = require('cla-modules/openapi-tools')(spec);
    const cfg = openapi.getDockerConfig(spec) || {};
    let dockerfile = '';
    const append = (...args) => {
        args = (args || []).filter((item) => item !== null && item !== undefined);
        if (args.length > 1) {
            dockerfile += args.join(' ') + '\n';
        }
    };
    const appendObj = (prefix, obj) => {
        if (obj) {
            for ([key, value] of Object.entries(obj)) {
                append(prefix, key, value);
            }
        }
    };
    const appendObjReduced = (prefix, obj, separator='=') => {
        if (obj) {
            append(prefix, Object.entries(obj)
                .map(([key, value]) => key + separator + value)
                .reduce((prev, curr) => prev + ' ' + curr));
        }
    };
    const appendArray = (prefix, arr) => {
        if (arr) {
            arr.forEach((element) => append(prefix, element));
        }
    };
    const appendArrayReduced = (prefix, arr) => {
        if (arr) {
            append(prefix, ...arr);
        }
    };
    append('FROM', cfg.from || 'node');
    appendObjReduced('LABEL', cfg.labels);
    appendObjReduced('ENV', cfg.env);
    append('WORKDIR', cfg.workdir || '/app');
    appendObj('ADD', cfg.add); // TODO: automatically add referenced files?
    append('ADD', specPath, specPath);
    appendArrayReduced('RUN apt-get update && apt-get install -y', cfg.buildDependencies);
    appendArrayReduced('RUN apt-get update && apt-get install -y', cfg.runtimeDependencies);
    if (local) {
        append('ADD', 'cli-adapter', 'cli-adapter');
        append('RUN', 'cd cli-adapter && npm install -g lerna && lerna bootstrap');
        append('WORKDIR', 'cli-adapter');
        append('CMD', `["npm", "run", "cla", "--", "start", "../${specPath}"]`);
    } else {
        append('RUN', 'npm install -g dwolters/rest-cli-adapter');
        append('CMD', `["cla", "start", "${specPath}"]`);
    }
    appendArray('RUN', cfg.run);
    appendArrayReduced('RUN apt-get remove -y', cfg.buildDependencies);
    append('EXPOSE', openapi.getPort(spec, process.env.PORT));
    return dockerfile;
};
