/* eslint-disable space-before-function-paren */
const path = require('path');
const jsonfile = require('jsonfile').readFileSync;
const app = require('../app')(jsonfile(path.join(__dirname, '../../../examples/test/json//exitcodemapping.' + process.env.FORMAT + '.json')));
const service = require('supertest')(app);

describe('Exit Code Mapping', function () {
    it('should by default return status 200 in case of exit code 0', function (done) {
        service
            .get('/test/default200')
            .expect(200)
            .end((err) => done(err));
    });

    it('should by default return status 500 in case of exit code unequal to 0', function (done) {
        service
            .get('/test/default500')
            .expect(500)
            .end((err) => done(err));
    });

    it('should map exit code 1 to status code 404', function (done) {
        service
            .get('/test/1map404')
            .expect(404)
            .end((err) => done(err));
    });
});
