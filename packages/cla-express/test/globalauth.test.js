/* eslint-disable space-before-function-paren */
const path = require('path');
const expect = require('chai').expect;
const jsonfile = require('jsonfile').readFileSync;
const app = require('../app')(jsonfile(path.join(__dirname, '../../../examples/test/json//globalauth.' + process.env.FORMAT + '.json')));
const service = require('supertest')(app);

describe('Global Auth', function () {
    it('rejects request with missing credentials at first endpoint', function (done) {
        service
            .get('/test/auth/globalauth/1')
            .expect(401)
            .expect('Content-Type', /html/)
            .end((err, res) => {
                expect(res.text).to.include('Unauthorized', 'Missing status message!');
                done(err);
            });
    });

    it('rejects request with missing credentials at second endpoint', function (done) {
        service
            .get('/test/auth/globalauth/2')
            .expect(401)
            .expect('Content-Type', /html/)
            .end((err, res) => {
                expect(res.text).to.include('Unauthorized', 'Missing status message!');
                done(err);
            });
    });

    it('accepts request with valid credentials', function (done) {
        service
            .get('/test/auth/globalauth/1?test=value')
            .auth('username', 'password')
            .expect(200)
            .expect('Content-Type', /json/)
            .end(done);
    });
});
