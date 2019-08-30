/* eslint-disable space-before-function-paren */
const path = require('path');
const expect = require('chai').expect;
const jsonfile = require('jsonfile').readFileSync;
const app = require('../app')(jsonfile(path.join(__dirname, '../../../examples/test/json/apikey.' + process.env.FORMAT + '.json')));
const service = require('supertest')(app);

describe('API Key Authentication', function () {
    it('accepts valid key in query', function (done) {
        service
            .get('/test/auth/apikey/query?api_key=1234&test=value')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('value', 'Wrong transformed parameter value!');
                done(err);
            });
    });

    it('rejects missing key in query', function (done) {
        service
            .get('/test/auth/apikey/query?test=value')
            .expect(401)
            .expect('Content-Type', /html/)
            .end((err, res) => {
                expect(res.text).to.include('Unauthorized', 'Missing error message!');
                done(err);
            });
    });

    it('rejects invalid key in query', function (done) {
        service
            .get('/test/auth/apikey/query?api_key=invalid&test=value')
            .expect(401)
            .expect('Content-Type', /text\/html/)
            .end((err, res) => {
                expect(res.text).to.include('Unauthorized', 'Missing error message!');
                done(err);
            });
    });

    it('accepts valid key in header', function (done) {
        service
            .get('/test/auth/apikey/header')
            .set('api_key', '1234')
            .set('test', 'value')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('value', 'Wrong transformed parameter value!');
                done(err);
            });
    });

    it('rejects invalid key in header', function (done) {
        service
            .get('/test/auth/apikey/header')
            .set('api_key', 'invalid')
            .set('test', 'value')
            .expect(401)
            .expect('Content-Type', /text\/html/)
            .end((err, res) => {
                expect(res.text).to.include('Unauthorized', 'Missing error message!');
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
