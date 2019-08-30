const fs = require('fs');
const path = require('path');
const yamljs = require('yamljs');
const jsonfile = require('jsonfile').writeFileSync;
const openapi2swagger = require('./openapi2swagger');

const inputDir = path.join(__dirname, '../../../../examples/test/');
const outputDir = path.join(__dirname, '../../../../examples/test/json');
const template = yamljs.load(path.join(inputDir, './template.openapi.yaml'));

fs.readdirSync(inputDir)
    .filter((fn) => fn.endsWith('openapi.yaml') && fn !== 'template.openapi.yaml')
    .map((fn) => {
        const oa3 = Object.assign({}, template, yamljs.load(path.join(inputDir, fn)));
        const sw2 = openapi2swagger(oa3);

        return {fn, oa3, sw2};
    })
    .forEach((spec) => {
        const baseFileName = spec.fn.replace('.openapi.yaml', '');
        jsonfile(path.join(outputDir, baseFileName + '.openapi.json'), spec.oa3);
        jsonfile(path.join(outputDir, baseFileName + '.swagger.json'), spec.sw2);
    });
