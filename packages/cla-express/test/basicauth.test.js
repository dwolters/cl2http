/* eslint-disable space-before-function-paren */
const path = require('path');
const expect = require('chai').expect;
const jsonfile = require('jsonfile').readFileSync;
const app = require('../app')(jsonfile(path.join(__dirname, '../../../examples/test/json/basicauth.' + process.env.FORMAT + '.json')));
const service = require('supertest')(app);

describe('HTTP Basic Auth', function () {
    it('accepts valid user credentials', function (done) {
        service
            .get('/test/auth/basicauth?test=value')
            .auth('username', 'password')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('value', 'Wrong transformed parameter value!');
                done(err);
            });
    });

    it('rejects invalid password', function (done) {
        service
            .get('/test/auth/basicauth')
            .auth('username', 'wrong-password')
            .expect(401)
            .expect('Content-Type', /html/)
            .end((err, res) => {
                expect(res.text).to.include('Unauthorized', 'Missing status message!');
                done(err);
            });
    });

    it('rejects non-existent user', function (done) {
        service
            .get('/test/auth/basicauth')
            .auth('wrong-username', 'password')
            .expect(401)
            .expect('Content-Type', /html/)
            .end((err, res) => {
                expect(res.text).to.include('Unauthorized', 'Missing status message!');
                done(err);
            });
    });

    it('rejects missing credentials', function (done) {
        service
            .get('/test/auth/basicauth')
            .expect(401)
            .expect('Content-Type', /html/)
            .end((err, res) => {
                expect(res.text).to.include('Unauthorized', 'Missing status message!');
                done(err);
            });
    });

    it('supports endpoints without security', function (done) {
        service
            .get('/test/noauth?test=value')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('value', 'Wrong transformed parameter value!');
                done(err);
            });
    });
});
