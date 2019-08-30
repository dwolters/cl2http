/* eslint-disable space-before-function-paren */
const path = require('path');
const expect = require('chai').expect;
const jsonfile = require('jsonfile').readFileSync;
const app = require('../app')(jsonfile(path.join(__dirname, '../../../examples/test/json/bearer.' + process.env.FORMAT + '.json')));
const service = require('supertest')(app);

describe('HTTP Bearer Auth', function () {
    it('accepts valid Bearer token in header', function (done) {
        service
            .post('/test/auth/bearer?test=value')
            .set('Authorization', '1234')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('value', 'Wrong parameter value!');
                done(err);
            });
    });

    it('accepts valid Bearer token in form data', function (done) {
        service
            .post('/test/auth/bearer?test=value')
            .send('access_token=1234')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('value', 'Wrong parameter value!');
                done(err);
            });
    });

    it('accepts valid Bearer token in query', function (done) {
        service
            .post('/test/auth/bearer?access_token=1234&test=value')
            .expect(200)
            .expect('Content-Type', /json/)
            .end((err, res) => {
                expect(res.body.command).to.equal('argCommand', 'Invoked wrong sub-command!');
                expect(res.body.arguments.requiredArg).to.equal('value', 'Wrong parameter value!');
                done(err);
            });
    });

    it('rejects missing Bearer token', function (done) {
        service
            .post('/test/auth/bearer?test=value')
            .expect(401)
            .expect('Content-Type', /html/)
            .end((err, res) => {
                expect(res.text).to.include('Unauthorized', 'Missing error message!');
                done(err);
            });
    });

    it('rejects invalid Bearer token (in query)', function (done) {
        service
            .post('/test/auth/bearer?access_token=invalid&test=value')
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
                expect(res.body.arguments.requiredArg).to.equal('value', 'Wrong parameter value!');
                done(err);
            });
    });
});
