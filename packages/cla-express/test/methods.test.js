/* eslint-disable space-before-function-paren */
const path = require('path');
const jsonfile = require('jsonfile').readFileSync;
const app = require('../app')(jsonfile(path.join(__dirname, '../../../examples/test/json/methods.' + process.env.FORMAT + '.json')));
const service = require('supertest')(app);

describe('HTTP method support', function () {
    it('GET', function (done) {
        service
            .get('/test/httpMethods')
            .expect('Content-Type', /text\/plain/)
            .expect(200, /Hello World/)
            .end(done);
        });

        it('POST', function (done) {
            service
            .post('/test/httpMethods')
            .expect(200, /Hello World/)
            .end(done);
    });

    it('PUT', function (done) {
        service
            .put('/test/httpMethods')
            .expect(200, /Hello World/)
            .end(done);
    });

    it('DELETE', function (done) {
        service
            .post('/test/httpMethods')
            .expect(200, /Hello World/)
            .end(done);
    });
});
