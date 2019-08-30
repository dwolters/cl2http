/* eslint-disable space-before-function-paren */
const expect = require('chai').expect;
const generateDockerfile = require('./../generate-dockerfile');

const spec = Object.freeze(Object.assign({
    'x-docker': {
        from: 'node:9.3',
        labels: {
            label1: 'value1',
            label2: 'value2',
        },
        env: {
            ENV1: 'value1',
            ENV2: 'value2',
        },
        workdir: '/test',
        add: {
            '/src1': '/dest1',
            'src2': 'dest2',
        },
        buildDependencies: ['build-tools', 'curl'],
        runtimeDependencies: ['nodejs', 'pandoc'],
        run: [
            'cmd1',
            'cmd2',
        ],
    },
}, (process.env.FORMAT === 'openapi')? {
    openapi: '3.0.1',
    servers: [{url: 'http://abc.def:1234'}],
} : {
    swagger: '2.0',
    host: 'abc.def:1234',
}));

const specPath = 'test.' + process.env.FORMAT.toLowerCase() + '.json';

describe('Dockerfile Creation', function () {
    it('creates Dockerfile correctly', function () {
        expect(generateDockerfile(spec, specPath)).to.equal(
`FROM node:9.3
LABEL label1=value1 label2=value2
ENV ENV1=value1 ENV2=value2
WORKDIR /test
ADD /src1 /dest1
ADD src2 dest2
ADD ${specPath} ${specPath}
RUN apt-get update && apt-get install -y build-tools curl
RUN apt-get update && apt-get install -y nodejs pandoc
RUN npm install -g dwolters/rest-cli-adapter
CMD ["cla", "start", "${specPath}"]
RUN cmd1
RUN cmd2
RUN apt-get remove -y build-tools curl
EXPOSE 1234
`, 'wrong Dockerfile!');
});

it('creates Dockerfile with minimum statements for empty config', function () {
    expect(generateDockerfile({openapi: '3.0.1'}, specPath)).to.equal(
`FROM node
WORKDIR /app
ADD ${specPath} ${specPath}
RUN npm install -g dwolters/rest-cli-adapter
CMD ["cla", "start", "${specPath}"]
EXPOSE 80
`, 'wrong Dockerfile!');
    });
});
